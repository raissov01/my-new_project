package telegram

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gotd/td/session"
	"github.com/gotd/td/telegram"
	"github.com/gotd/td/telegram/auth"
	"github.com/gotd/td/telegram/downloader"
	"github.com/gotd/td/tg"
	"github.com/gotd/td/tgerr"
)

// BotScrapeConfig drives RunBotScrape. AppID/AppHash/Phone/SessionPath
// come from the same env vars as telegram-import; an existing session
// file lets us skip SMS verification on subsequent runs.
type BotScrapeConfig struct {
	AppID       int
	AppHash     string
	Phone       string
	SessionPath string
	BotUsername string        // without leading @
	OutputDir   string        // default: ./bot-dump-<username>
	ClickDelay  time.Duration // pause between callbacks (flood protection); default 2s
	MaxDepth    int           // recursion safety cap; default 8
}

type urlButton struct {
	Label string `json:"label"`
	URL   string `json:"url"`
}

type botMenuNode struct {
	Path       []string       `json:"path"`
	Text       string         `json:"text,omitempty"`
	URLButtons []urlButton    `json:"urlButtons,omitempty"`
	Files      []string       `json:"files,omitempty"`
	Children   []*botMenuNode `json:"children,omitempty"`
}

// BotScraper traverses an inline-keyboard or reply-keyboard bot menu,
// downloading any documents the bot sends and dumping the menu structure
// as JSON.
type BotScraper struct {
	cfg        BotScrapeConfig
	client     *telegram.Client
	api        *tg.Client
	downloader *downloader.Downloader
	bot        *tg.User
	peer       *tg.InputPeerUser
	visited    map[string]bool
}

// stepResult aggregates everything the bot said in response to one
// user action: a press or /start. Bots routinely send 2-3 messages
// in sequence (welcome blurb + new keyboard, or "here's your file"
// + the document + a refreshed keyboard), so we need to collect all
// of them, not just the latest.
type stepResult struct {
	Text        string
	Files       []string
	URLButtons  []urlButton
	KeyboardMsg *tg.Message // last message in the batch that has a keyboard
}

// RunBotScrape authenticates, resolves the bot, and walks its menu tree.
func RunBotScrape(ctx context.Context, cfg BotScrapeConfig) error {
	cfg.BotUsername = normalizeUsername(cfg.BotUsername)
	if cfg.BotUsername == "" {
		return fmt.Errorf("BotUsername is required")
	}
	if cfg.AppID == 0 || cfg.AppHash == "" {
		return fmt.Errorf("TELEGRAM_APP_ID and TELEGRAM_APP_HASH are required")
	}
	if cfg.Phone == "" {
		return fmt.Errorf("TELEGRAM_PHONE is required")
	}
	if cfg.OutputDir == "" {
		cfg.OutputDir = "./bot-dump-" + cfg.BotUsername
	}
	if cfg.ClickDelay == 0 {
		cfg.ClickDelay = 2 * time.Second
	}
	if cfg.MaxDepth == 0 {
		cfg.MaxDepth = 8
	}
	if cfg.SessionPath == "" {
		cfg.SessionPath = ".telegram-session"
	}

	if err := os.MkdirAll(filepath.Join(cfg.OutputDir, "files"), 0755); err != nil {
		return fmt.Errorf("create output dir: %w", err)
	}

	storage := &session.FileStorage{Path: cfg.SessionPath}
	client := telegram.NewClient(cfg.AppID, cfg.AppHash, telegram.Options{
		SessionStorage: storage,
	})

	return client.Run(ctx, func(ctx context.Context) error {
		flow := auth.NewFlow(terminalAuth{phone: cfg.Phone}, auth.SendCodeOptions{})
		if err := client.Auth().IfNecessary(ctx, flow); err != nil {
			return fmt.Errorf("auth: %w", err)
		}
		log.Printf("[bot-scrape] authenticated, resolving @%s", cfg.BotUsername)

		s := &BotScraper{
			cfg:        cfg,
			client:     client,
			api:        client.API(),
			downloader: downloader.NewDownloader(),
			visited:    make(map[string]bool),
		}
		return s.run(ctx)
	})
}

func (s *BotScraper) run(ctx context.Context) error {
	res, err := s.api.ContactsResolveUsername(ctx, &tg.ContactsResolveUsernameRequest{
		Username: s.cfg.BotUsername,
	})
	if err != nil {
		return fmt.Errorf("resolve bot: %w", err)
	}
	for _, u := range res.Users {
		user, ok := u.(*tg.User)
		if !ok {
			continue
		}
		if !user.Bot {
			return fmt.Errorf("@%s is not a bot", s.cfg.BotUsername)
		}
		s.bot = user
		break
	}
	if s.bot == nil {
		return fmt.Errorf("@%s not found", s.cfg.BotUsername)
	}
	s.peer = &tg.InputPeerUser{
		UserID:     s.bot.ID,
		AccessHash: s.bot.AccessHash,
	}
	log.Printf("[bot-scrape] bot resolved: @%s id=%d", s.bot.Username, s.bot.ID)

	log.Println("[bot-scrape] sending /start")
	sinceID := s.currentLastMsgID(ctx)
	if err := s.sendText(ctx, "/start"); err != nil {
		return fmt.Errorf("send /start: %w", err)
	}
	step, err := s.collectStep(ctx, sinceID, 6)
	if err != nil {
		return err
	}
	if step.KeyboardMsg == nil && step.Text == "" {
		return fmt.Errorf("bot did not respond to /start")
	}

	root := &botMenuNode{
		Path:       []string{"/start"},
		Text:       step.Text,
		Files:      step.Files,
		URLButtons: step.URLButtons,
	}
	if step.KeyboardMsg != nil {
		if err := s.expandMenu(ctx, step.KeyboardMsg, root, 0); err != nil {
			return err
		}
	}

	treePath := filepath.Join(s.cfg.OutputDir, "tree.json")
	f, err := os.Create(treePath)
	if err != nil {
		return fmt.Errorf("create tree.json: %w", err)
	}
	defer f.Close()
	enc := json.NewEncoder(f)
	enc.SetIndent("", "  ")
	if err := enc.Encode(root); err != nil {
		return fmt.Errorf("encode tree: %w", err)
	}

	log.Printf("[bot-scrape] done — output: %s (visited %d distinct menus)",
		s.cfg.OutputDir, len(s.visited))
	return nil
}

// expandMenu iterates every actionable button on menuMsg, gathers the
// bot's full multi-message reply for each press, and recurses into any
// sub-menus. After each press we use ensureAtState to walk back to the
// parent menu so the next sibling press is interpreted correctly.
func (s *BotScraper) expandMenu(ctx context.Context, menuMsg *tg.Message, node *botMenuNode, depth int) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	if depth > s.cfg.MaxDepth {
		log.Printf("[bot-scrape] max depth at %v", node.Path)
		return nil
	}

	cbs, _ := extractButtons(menuMsg)
	actionable := 0
	for _, cb := range cbs {
		if !isBackButton(cb.Label) {
			actionable++
		}
	}
	if actionable == 0 {
		return nil
	}

	// Cycle detection on menus with branches. Leaves were already saved
	// by the caller (collectStep on the parent press), so we don't need
	// to revisit them.
	h := hashMenu(menuMsg)
	if s.visited[h] {
		return nil
	}
	s.visited[h] = true
	parentHash := h

	log.Printf("[bot-scrape] [d=%d] %s — %d cb (%d actionable)",
		depth, strings.Join(node.Path, " > "), len(cbs), actionable)

	for _, cb := range cbs {
		if isBackButton(cb.Label) {
			continue
		}

		child := &botMenuNode{
			Path: append(append([]string{}, node.Path...), cb.Label),
		}

		sinceID := s.currentLastMsgID(ctx)
		if err := s.press(ctx, menuMsg.ID, cb); err != nil {
			log.Printf("[bot-scrape]   press %q failed: %v", cb.Label, err)
			continue
		}

		step, err := s.collectStep(ctx, sinceID, 4)
		if err != nil {
			log.Printf("[bot-scrape]   collect for %q failed: %v", cb.Label, err)
			continue
		}
		if step.Text == "" && len(step.Files) == 0 && len(step.URLButtons) == 0 && step.KeyboardMsg == nil {
			log.Printf("[bot-scrape]   %q: no response", cb.Label)
			continue
		}

		child.Text = step.Text
		child.Files = step.Files
		child.URLButtons = step.URLButtons

		if step.KeyboardMsg != nil {
			if err := s.expandMenu(ctx, step.KeyboardMsg, child, depth+1); err != nil {
				return err
			}
		}

		if child.Text != "" || len(child.URLButtons) > 0 || len(child.Files) > 0 || len(child.Children) > 0 {
			node.Children = append(node.Children, child)
		}

		if err := s.ensureAtState(ctx, parentHash, node.Path); err != nil {
			log.Printf("[bot-scrape]   recovery to %s failed: %v — skipping remaining siblings",
				strings.Join(node.Path, " > "), err)
			return nil
		}
	}
	return nil
}

// collectStep waits for the bot to reply, then reads every NEW message
// (ID > sinceID) it sent. Texts are concatenated; documents downloaded;
// URL buttons collected; the LAST message in the batch with a keyboard
// becomes the next-state anchor for further recursion.
func (s *BotScraper) collectStep(ctx context.Context, sinceID int, attempts int) (*stepResult, error) {
	var collected []*tg.Message
	for i := 0; i < attempts; i++ {
		time.Sleep(s.cfg.ClickDelay)
		res, err := s.api.MessagesGetHistory(ctx, &tg.MessagesGetHistoryRequest{
			Peer:  s.peer,
			Limit: 20,
		})
		if err != nil {
			if d, ok := tgerr.AsFloodWait(err); ok {
				log.Printf("[bot-scrape] FLOOD_WAIT %s", d)
				time.Sleep(d + 2*time.Second)
				continue
			}
			return nil, err
		}
		collected = collected[:0]
		// History returns newest-first; walk until ID <= sinceID.
		for _, raw := range extractMessagesList(res) {
			m, ok := raw.(*tg.Message)
			if !ok {
				continue
			}
			if m.ID <= sinceID {
				break
			}
			if m.Out {
				continue
			}
			if peer, ok := m.FromID.(*tg.PeerUser); ok && peer.UserID != s.bot.ID {
				continue
			}
			collected = append(collected, m)
		}
		if len(collected) > 0 {
			break
		}
	}

	if len(collected) == 0 {
		return &stepResult{}, nil
	}

	// Reverse to chronological order so concatenated text reads naturally.
	for i, j := 0, len(collected)-1; i < j; i, j = i+1, j-1 {
		collected[i], collected[j] = collected[j], collected[i]
	}

	var texts []string
	var files []string
	var urls []urlButton
	var keyboardMsg *tg.Message
	for _, m := range collected {
		if m.Message != "" {
			texts = append(texts, m.Message)
		}
		if path, _ := s.tryDownloadDocument(ctx, m); path != "" {
			files = appendUnique(files, path)
		}
		cbs, msgURLs := extractButtons(m)
		urls = append(urls, msgURLs...)
		if len(cbs) > 0 {
			keyboardMsg = m
		}
	}

	return &stepResult{
		Text:        strings.Join(texts, "\n\n"),
		Files:       files,
		URLButtons:  urls,
		KeyboardMsg: keyboardMsg,
	}, nil
}

// ensureAtState walks the bot's UI back to the menu identified by targetHash.
//
// Strategy in order of cost:
//  1. Already there → no-op.
//  2. Press a Back button on the current keyboard, up to 3 attempts.
//  3. Replay fallbackPath labels as plain text — most reply-keyboard bots
//     accept top-level labels as global commands from any state, so this
//     navigates without needing /start.
//
// /start is intentionally NOT used here: Telegram heavily flood-limits it
// (FLOOD_WAIT can be 30+ minutes) which would kill long traversals.
func (s *BotScraper) ensureAtState(ctx context.Context, targetHash string, fallbackPath []string) error {
	for i := 0; i < 3; i++ {
		latest, err := s.latestBotMessage(ctx)
		if err != nil {
			return err
		}
		if latest != nil && hashMenu(latest) == targetHash {
			return nil
		}
		if latest == nil {
			break
		}
		cbs, _ := extractButtons(latest)
		var back *callbackBtn
		for j := range cbs {
			if isBackButton(cbs[j].Label) {
				back = &cbs[j]
				break
			}
		}
		if back == nil {
			break
		}
		if err := s.press(ctx, latest.ID, *back); err != nil {
			break
		}
		time.Sleep(s.cfg.ClickDelay)
	}

	// Replay path labels as direct sends. Skip the synthetic "/start" head.
	for _, label := range fallbackPath {
		if label == "/start" {
			continue
		}
		sinceID := s.currentLastMsgID(ctx)
		if err := s.sendText(ctx, label); err != nil {
			return fmt.Errorf("send %q during recovery: %w", label, err)
		}
		step, err := s.collectStep(ctx, sinceID, 3)
		if err != nil {
			return fmt.Errorf("collect after %q: %w", label, err)
		}
		if step.KeyboardMsg == nil && step.Text == "" {
			return fmt.Errorf("bot ignored %q during recovery", label)
		}
	}

	latest, err := s.latestBotMessage(ctx)
	if err == nil && latest != nil && hashMenu(latest) != targetHash {
		// Not fatal — different welcome blurb or content. The visited cache
		// will guard against re-exploring already-known menus.
		log.Printf("[bot-scrape]   recovered to a different state than expected")
	}
	return nil
}

// ── Telegram primitives ────────────────────────────────────────────────

func (s *BotScraper) sendText(ctx context.Context, text string) error {
	for {
		_, err := s.api.MessagesSendMessage(ctx, &tg.MessagesSendMessageRequest{
			Peer:     s.peer,
			Message:  text,
			RandomID: rand.Int63(),
		})
		if err == nil {
			return nil
		}
		// Telegram rate-limits /start aggressively (FLOOD_WAIT can be 30+
		// min). Honoring the suggested wait is the only way through.
		if d, ok := tgerr.AsFloodWait(err); ok {
			log.Printf("[bot-scrape] FLOOD_WAIT %s on send %q — waiting", d, truncate(text, 40))
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(d + 2*time.Second):
			}
			continue
		}
		return err
	}
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}

// press dispatches the right MTProto call for either an inline-keyboard
// callback button or a reply-keyboard text button.
func (s *BotScraper) press(ctx context.Context, msgID int, btn callbackBtn) error {
	switch btn.Mode {
	case pressCallback:
		return s.clickCallback(ctx, msgID, btn.Data)
	case pressText:
		return s.sendText(ctx, btn.Label)
	}
	return fmt.Errorf("unknown press mode for %q", btn.Label)
}

func (s *BotScraper) clickCallback(ctx context.Context, msgID int, data []byte) error {
	for {
		_, err := s.api.MessagesGetBotCallbackAnswer(ctx, &tg.MessagesGetBotCallbackAnswerRequest{
			Peer:  s.peer,
			MsgID: msgID,
			Data:  data,
		})
		if err == nil {
			return nil
		}
		if d, ok := tgerr.AsFloodWait(err); ok {
			log.Printf("[bot-scrape] FLOOD_WAIT %s on callback", d)
			time.Sleep(d + 2*time.Second)
			continue
		}
		return err
	}
}

// currentLastMsgID returns the most recent message ID in the chat (any
// sender). Used as the snapshot before pressing/sending so collectStep
// knows what's "new".
func (s *BotScraper) currentLastMsgID(ctx context.Context) int {
	res, err := s.api.MessagesGetHistory(ctx, &tg.MessagesGetHistoryRequest{
		Peer:  s.peer,
		Limit: 1,
	})
	if err != nil {
		return 0
	}
	for _, raw := range extractMessagesList(res) {
		if m, ok := raw.(*tg.Message); ok {
			return m.ID
		}
	}
	return 0
}

// latestBotMessage returns the most recent inbound (non-Out) message.
func (s *BotScraper) latestBotMessage(ctx context.Context) (*tg.Message, error) {
	res, err := s.api.MessagesGetHistory(ctx, &tg.MessagesGetHistoryRequest{
		Peer:  s.peer,
		Limit: 5,
	})
	if err != nil {
		return nil, err
	}
	for _, raw := range extractMessagesList(res) {
		m, ok := raw.(*tg.Message)
		if !ok {
			continue
		}
		if m.Out {
			continue
		}
		if peer, ok := m.FromID.(*tg.PeerUser); ok && peer.UserID != s.bot.ID {
			continue
		}
		return m, nil
	}
	return nil, nil
}

func (s *BotScraper) tryDownloadDocument(ctx context.Context, msg *tg.Message) (string, error) {
	if msg.Media == nil {
		return "", nil
	}
	media, ok := msg.Media.(*tg.MessageMediaDocument)
	if !ok {
		return "", nil
	}
	doc, ok := media.Document.(*tg.Document)
	if !ok {
		return "", nil
	}

	name := ""
	for _, attr := range doc.Attributes {
		if a, ok := attr.(*tg.DocumentAttributeFilename); ok {
			name = a.FileName
			break
		}
	}
	if name == "" {
		name = fmt.Sprintf("doc_%d%s", doc.ID, mimeToExt(doc.MimeType))
	}
	name = sanitizeFilename(name)

	// Name files by document ID, not message ID — the bot may resend the
	// same document from many messages, but the doc.ID is stable.
	outPath := filepath.Join(s.cfg.OutputDir, "files", name)
	if _, err := os.Stat(outPath); err == nil {
		return outPath, nil
	}

	loc := &tg.InputDocumentFileLocation{
		ID:            doc.ID,
		AccessHash:    doc.AccessHash,
		FileReference: doc.FileReference,
	}
	if _, err := s.downloader.Download(s.api, loc).ToPath(ctx, outPath); err != nil {
		log.Printf("[bot-scrape]   download %q failed: %v", name, err)
		_ = os.Remove(outPath)
		return "", err
	}
	log.Printf("[bot-scrape]   downloaded → %s", outPath)
	return outPath, nil
}

// ── Helpers ────────────────────────────────────────────────────────────

type pressMode int

const (
	pressCallback pressMode = iota
	pressText
)

type callbackBtn struct {
	Label string
	Mode  pressMode
	Data  []byte
}

func extractButtons(msg *tg.Message) ([]callbackBtn, []urlButton) {
	var cbs []callbackBtn
	var urls []urlButton
	switch rm := msg.ReplyMarkup.(type) {
	case *tg.ReplyInlineMarkup:
		for _, row := range rm.Rows {
			for _, btn := range row.Buttons {
				switch b := btn.(type) {
				case *tg.KeyboardButtonCallback:
					cbs = append(cbs, callbackBtn{Label: b.Text, Mode: pressCallback, Data: b.Data})
				case *tg.KeyboardButtonURL:
					urls = append(urls, urlButton{Label: b.Text, URL: b.URL})
				}
			}
		}
	case *tg.ReplyKeyboardMarkup:
		for _, row := range rm.Rows {
			for _, btn := range row.Buttons {
				if b, ok := btn.(*tg.KeyboardButton); ok {
					cbs = append(cbs, callbackBtn{Label: b.Text, Mode: pressText})
				}
			}
		}
	}
	return cbs, urls
}

// hashMenu produces a stable digest from (message text + button labels +
// URL targets). Two bot screens with identical visible content collide,
// which is exactly what we want for cycle detection on Back navigation.
func hashMenu(msg *tg.Message) string {
	var sb strings.Builder
	sb.WriteString(msg.Message)
	sb.WriteByte('|')
	cbs, urls := extractButtons(msg)
	for _, c := range cbs {
		sb.WriteString(c.Label)
		sb.WriteByte(';')
	}
	sb.WriteByte('|')
	for _, u := range urls {
		sb.WriteString(u.Label)
		sb.WriteByte('=')
		sb.WriteString(u.URL)
		sb.WriteByte(';')
	}
	h := sha256.Sum256([]byte(sb.String()))
	return hex.EncodeToString(h[:8])
}

func extractMessagesList(res tg.MessagesMessagesClass) []tg.MessageClass {
	switch x := res.(type) {
	case *tg.MessagesMessages:
		return x.Messages
	case *tg.MessagesMessagesSlice:
		return x.Messages
	case *tg.MessagesChannelMessages:
		return x.Messages
	}
	return nil
}

func isBackButton(label string) bool {
	l := strings.ToLower(strings.TrimSpace(label))
	for _, prefix := range []string{"🔙", "⬅️", "⬅", "↩️", "↩", "◀️", "◀", "«"} {
		l = strings.TrimPrefix(l, prefix)
	}
	l = strings.TrimSpace(l)
	switch l {
	case "back", "назад", "артқа", "артка", "go back", "← back":
		return true
	}
	return false
}

func sanitizeFilename(s string) string {
	s = strings.ReplaceAll(s, "/", "_")
	s = strings.ReplaceAll(s, "\\", "_")
	s = strings.ReplaceAll(s, "..", "_")
	s = strings.TrimSpace(s)
	if s == "" {
		s = "file"
	}
	if len(s) > 200 {
		s = s[:200]
	}
	return s
}

func appendUnique(xs []string, s string) []string {
	for _, x := range xs {
		if x == s {
			return xs
		}
	}
	return append(xs, s)
}
