// tg-nuet: research-only Telegram crawler for NUET-related material.
//
// Three passes:
//   1. contacts.Search   — find channels/users with "NUET" in name/description
//   2. messages.SearchGlobal — messages in any joined chat mentioning the query
//   3. user dialogs (channels) — filter by title containing "nuet" (case-insensitive)
//
// All output is written as JSONL to stdout for offline analysis.
package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/gotd/td/session"
	"github.com/gotd/td/telegram"
	"github.com/gotd/td/tg"
	"github.com/gotd/td/tgerr"
	"github.com/joho/godotenv"
)

type Out struct {
	Pass     string          `json:"pass"`
	Channel  *ChannelInfo    `json:"channel,omitempty"`
	User     *UserInfo       `json:"user,omitempty"`
	Message  *MessageInfo    `json:"message,omitempty"`
	DialogID int64           `json:"dialog_id,omitempty"`
	Note     string          `json:"note,omitempty"`
	Raw      json.RawMessage `json:"raw,omitempty"`
}

type ChannelInfo struct {
	ID            int64  `json:"id"`
	AccessHash    int64  `json:"access_hash"`
	Username      string `json:"username,omitempty"`
	Title         string `json:"title"`
	About         string `json:"about,omitempty"`
	ParticipantsN int    `json:"participants,omitempty"`
	Broadcast     bool   `json:"broadcast"`
	Megagroup     bool   `json:"megagroup"`
	Verified      bool   `json:"verified"`
}

type UserInfo struct {
	ID        int64  `json:"id"`
	Username  string `json:"username,omitempty"`
	FirstName string `json:"first_name,omitempty"`
	Bot       bool   `json:"bot,omitempty"`
}

type MessageInfo struct {
	ID           int    `json:"id"`
	PeerTitle    string `json:"peer_title,omitempty"`
	PeerUsername string `json:"peer_username,omitempty"`
	Date         int    `json:"date"`
	Text         string `json:"text"`
	HasMedia     bool   `json:"has_media"`
	MediaKind    string `json:"media_kind,omitempty"`
	FileName     string `json:"file_name,omitempty"`
	MimeType     string `json:"mime_type,omitempty"`
	Views        int    `json:"views,omitempty"`
	Forwards     int    `json:"forwards,omitempty"`
	URL          string `json:"url,omitempty"`
}

func main() {
	_ = godotenv.Load()

	query := flag.String("q", "NUET", "search query")
	perChannelLimit := flag.Int("per-channel", 200, "max messages to dump per NUET-named channel")
	globalLimit := flag.Int("global-limit", 300, "max results from messages.SearchGlobal")
	flag.Parse()

	appID := 0
	if v := os.Getenv("TELEGRAM_APP_ID"); v != "" {
		fmt.Sscanf(v, "%d", &appID)
	}
	appHash := os.Getenv("TELEGRAM_APP_HASH")
	sessionPath := os.Getenv("TELEGRAM_SESSION_PATH")
	if sessionPath == "" {
		sessionPath = ".telegram-session"
	}
	if appID == 0 || appHash == "" {
		log.Fatal("Set TELEGRAM_APP_ID and TELEGRAM_APP_HASH (env or .env)")
	}

	storage := &session.FileStorage{Path: sessionPath}
	client := telegram.NewClient(appID, appHash, telegram.Options{SessionStorage: storage})

	ctx := context.Background()
	enc := json.NewEncoder(os.Stdout)

	err := client.Run(ctx, func(ctx context.Context) error {
		api := client.API()

		self, err := api.UsersGetUsers(ctx, []tg.InputUserClass{&tg.InputUserSelf{}})
		if err != nil {
			return fmt.Errorf("whoami: %w", err)
		}
		if len(self) > 0 {
			if u, ok := self[0].(*tg.User); ok {
				log.Printf("logged in as id=%d username=@%s phone=%s", u.ID, u.Username, u.Phone)
			}
		}

		channelCache := map[int64]*tg.Channel{}
		userCache := map[int64]*tg.User{}

		// PASS 1: contacts.Search
		log.Printf("[pass 1/3] contacts.Search q=%q", *query)
		csr, err := api.ContactsSearch(ctx, &tg.ContactsSearchRequest{Q: *query, Limit: 50})
		if err != nil {
			log.Printf("contacts.Search failed: %v", err)
		} else {
			for _, raw := range csr.Chats {
				if ch, ok := raw.(*tg.Channel); ok {
					channelCache[ch.ID] = ch
					info := chToInfo(ch)
					// fetch about via channels.GetFullChannel
					about := tryGetAbout(ctx, api, ch)
					info.About = about
					_ = enc.Encode(Out{Pass: "contacts.search", Channel: info})
				}
			}
			for _, raw := range csr.Users {
				if u, ok := raw.(*tg.User); ok {
					userCache[u.ID] = u
					_ = enc.Encode(Out{Pass: "contacts.search", User: userToInfo(u)})
				}
			}
		}

		// PASS 2: messages.SearchGlobal
		log.Printf("[pass 2/3] messages.SearchGlobal q=%q limit=%d", *query, *globalLimit)
		var offsetRate int
		var offsetID int
		var offsetPeer tg.InputPeerClass = &tg.InputPeerEmpty{}
		seen := 0
	GLOBAL:
		for seen < *globalLimit {
			batch := 100
			if rem := *globalLimit - seen; rem < batch {
				batch = rem
			}
			req := &tg.MessagesSearchGlobalRequest{
				Q:          *query,
				Filter:     &tg.InputMessagesFilterEmpty{},
				MinDate:    0,
				MaxDate:    0,
				OffsetRate: offsetRate,
				OffsetPeer: offsetPeer,
				OffsetID:   offsetID,
				Limit:      batch,
			}
			res, err := api.MessagesSearchGlobal(ctx, req)
			if err != nil {
				if d, ok := tgerr.AsFloodWait(err); ok {
					log.Printf("FLOOD_WAIT %s on SearchGlobal", d)
					time.Sleep(d + 2*time.Second)
					continue
				}
				log.Printf("SearchGlobal failed: %v", err)
				break
			}
			msgs, chats, users, nextRate := flatten(res)
			for _, c := range chats {
				if ch, ok := c.(*tg.Channel); ok {
					channelCache[ch.ID] = ch
				}
			}
			for _, u := range users {
				if x, ok := u.(*tg.User); ok {
					userCache[x.ID] = x
				}
			}
			if len(msgs) == 0 {
				break GLOBAL
			}
			var lastMsg *tg.Message
			for _, m := range msgs {
				mm, ok := m.(*tg.Message)
				if !ok {
					continue
				}
				lastMsg = mm
				info := buildMsgInfo(mm, channelCache, userCache)
				_ = enc.Encode(Out{Pass: "global.search", Message: info})
				seen++
				if seen >= *globalLimit {
					break GLOBAL
				}
			}
			if lastMsg == nil {
				break
			}
			offsetRate = nextRate
			offsetID = lastMsg.ID
			offsetPeer = peerToInput(lastMsg.PeerID, channelCache, userCache)
		}

		// PASS 3: user dialogs filtered by NUET in title
		log.Printf("[pass 3/3] scan dialogs for NUET-titled channels")
		nuetChannels := []*tg.Channel{}
		var dOffsetDate int
		var dOffsetID int
		var dOffsetPeer tg.InputPeerClass = &tg.InputPeerEmpty{}
		dialogCount := 0
		for dialogCount < 2000 {
			dres, err := api.MessagesGetDialogs(ctx, &tg.MessagesGetDialogsRequest{
				ExcludePinned: false,
				OffsetDate:    dOffsetDate,
				OffsetID:      dOffsetID,
				OffsetPeer:    dOffsetPeer,
				Limit:         100,
				Hash:          0,
			})
			if err != nil {
				if d, ok := tgerr.AsFloodWait(err); ok {
					time.Sleep(d + 2*time.Second)
					continue
				}
				log.Printf("dialogs failed: %v", err)
				break
			}
			dialogs, chats, users, msgs, hasMore := unpackDialogs(dres)
			for _, c := range chats {
				if ch, ok := c.(*tg.Channel); ok {
					channelCache[ch.ID] = ch
					if matchesNuet(ch.Title, ch.Username, *query) {
						nuetChannels = append(nuetChannels, ch)
					}
				}
			}
			for _, u := range users {
				if x, ok := u.(*tg.User); ok {
					userCache[x.ID] = x
				}
			}
			dialogCount += len(dialogs)
			if !hasMore || len(dialogs) == 0 {
				break
			}
			// advance offsets via last message of last dialog
			last := dialogs[len(dialogs)-1]
			if d, ok := last.(*tg.Dialog); ok {
				dOffsetID = d.TopMessage
				if mm := findMsgByID(msgs, d.TopMessage); mm != nil {
					dOffsetDate = mm.Date
				}
				dOffsetPeer = peerToInput(d.Peer, channelCache, userCache)
			}
		}
		log.Printf("scanned %d dialogs; %d NUET-titled channels", dialogCount, len(nuetChannels))

		// dump per-channel: emit channel info + last N messages from each
		for _, ch := range nuetChannels {
			info := chToInfo(ch)
			info.About = tryGetAbout(ctx, api, ch)
			_ = enc.Encode(Out{Pass: "dialog.channel", Channel: info})
			dumpChannel(ctx, api, ch, *perChannelLimit, enc)
		}

		return nil
	})
	if err != nil {
		log.Fatal(err)
	}
}

func matchesNuet(title, username, query string) bool {
	q := strings.ToLower(query)
	return strings.Contains(strings.ToLower(title), q) || strings.Contains(strings.ToLower(username), q)
}

func chToInfo(ch *tg.Channel) *ChannelInfo {
	return &ChannelInfo{
		ID:            ch.ID,
		AccessHash:    ch.AccessHash,
		Username:      ch.Username,
		Title:         ch.Title,
		ParticipantsN: ch.ParticipantsCount,
		Broadcast:     ch.Broadcast,
		Megagroup:     ch.Megagroup,
		Verified:      ch.Verified,
	}
}

func userToInfo(u *tg.User) *UserInfo {
	return &UserInfo{ID: u.ID, Username: u.Username, FirstName: u.FirstName, Bot: u.Bot}
}

func tryGetAbout(ctx context.Context, api *tg.Client, ch *tg.Channel) string {
	full, err := api.ChannelsGetFullChannel(ctx, &tg.InputChannel{ChannelID: ch.ID, AccessHash: ch.AccessHash})
	if err != nil {
		return ""
	}
	if cf, ok := full.FullChat.(*tg.ChannelFull); ok {
		return cf.About
	}
	return ""
}

func flatten(res tg.MessagesMessagesClass) (msgs []tg.MessageClass, chats []tg.ChatClass, users []tg.UserClass, nextRate int) {
	switch x := res.(type) {
	case *tg.MessagesMessages:
		return x.Messages, x.Chats, x.Users, 0
	case *tg.MessagesMessagesSlice:
		return x.Messages, x.Chats, x.Users, x.NextRate
	case *tg.MessagesChannelMessages:
		return x.Messages, x.Chats, x.Users, 0
	}
	return
}

func unpackDialogs(res tg.MessagesDialogsClass) (dialogs []tg.DialogClass, chats []tg.ChatClass, users []tg.UserClass, msgs []tg.MessageClass, hasMore bool) {
	switch x := res.(type) {
	case *tg.MessagesDialogs:
		return x.Dialogs, x.Chats, x.Users, x.Messages, false
	case *tg.MessagesDialogsSlice:
		return x.Dialogs, x.Chats, x.Users, x.Messages, true
	}
	return
}

func findMsgByID(msgs []tg.MessageClass, id int) *tg.Message {
	for _, m := range msgs {
		if mm, ok := m.(*tg.Message); ok && mm.ID == id {
			return mm
		}
	}
	return nil
}

func peerToInput(p tg.PeerClass, chMap map[int64]*tg.Channel, uMap map[int64]*tg.User) tg.InputPeerClass {
	switch x := p.(type) {
	case *tg.PeerChannel:
		if ch := chMap[x.ChannelID]; ch != nil {
			return &tg.InputPeerChannel{ChannelID: ch.ID, AccessHash: ch.AccessHash}
		}
		return &tg.InputPeerChannel{ChannelID: x.ChannelID}
	case *tg.PeerUser:
		if u := uMap[x.UserID]; u != nil {
			return &tg.InputPeerUser{UserID: u.ID, AccessHash: u.AccessHash}
		}
		return &tg.InputPeerUser{UserID: x.UserID}
	case *tg.PeerChat:
		return &tg.InputPeerChat{ChatID: x.ChatID}
	}
	return &tg.InputPeerEmpty{}
}

func buildMsgInfo(m *tg.Message, chMap map[int64]*tg.Channel, uMap map[int64]*tg.User) *MessageInfo {
	info := &MessageInfo{ID: m.ID, Date: m.Date, Text: m.Message, Views: m.Views, Forwards: m.Forwards}
	if pc, ok := m.PeerID.(*tg.PeerChannel); ok {
		if ch := chMap[pc.ChannelID]; ch != nil {
			info.PeerTitle = ch.Title
			info.PeerUsername = ch.Username
			if ch.Username != "" {
				info.URL = fmt.Sprintf("https://t.me/%s/%d", ch.Username, m.ID)
			}
		}
	} else if pu, ok := m.PeerID.(*tg.PeerUser); ok {
		if u := uMap[pu.UserID]; u != nil {
			info.PeerTitle = u.FirstName
			info.PeerUsername = u.Username
		}
	}
	if m.Media != nil {
		info.HasMedia = true
		switch md := m.Media.(type) {
		case *tg.MessageMediaDocument:
			info.MediaKind = "document"
			if doc, ok := md.Document.(*tg.Document); ok {
				info.MimeType = doc.MimeType
				for _, a := range doc.Attributes {
					if fn, ok := a.(*tg.DocumentAttributeFilename); ok {
						info.FileName = fn.FileName
					}
				}
			}
		case *tg.MessageMediaPhoto:
			info.MediaKind = "photo"
		case *tg.MessageMediaWebPage:
			info.MediaKind = "webpage"
		default:
			info.MediaKind = fmt.Sprintf("%T", md)
		}
	}
	return info
}

func dumpChannel(ctx context.Context, api *tg.Client, ch *tg.Channel, limit int, enc *json.Encoder) {
	peer := &tg.InputPeerChannel{ChannelID: ch.ID, AccessHash: ch.AccessHash}
	chMap := map[int64]*tg.Channel{ch.ID: ch}
	uMap := map[int64]*tg.User{}
	pulled := 0
	offsetID := 0
	for pulled < limit {
		batch := 100
		if rem := limit - pulled; rem < batch {
			batch = rem
		}
		res, err := api.MessagesGetHistory(ctx, &tg.MessagesGetHistoryRequest{
			Peer: peer, Limit: batch, OffsetID: offsetID,
		})
		if err != nil {
			if d, ok := tgerr.AsFloodWait(err); ok {
				time.Sleep(d + 2*time.Second)
				continue
			}
			log.Printf("history failed for %s: %v", ch.Title, err)
			return
		}
		var lastID int
		count := 0
		switch x := res.(type) {
		case *tg.MessagesChannelMessages:
			for _, c := range x.Chats {
				if cc, ok := c.(*tg.Channel); ok {
					chMap[cc.ID] = cc
				}
			}
			for _, u := range x.Users {
				if uu, ok := u.(*tg.User); ok {
					uMap[uu.ID] = uu
				}
			}
			for _, m := range x.Messages {
				mm, ok := m.(*tg.Message)
				if !ok {
					continue
				}
				lastID = mm.ID
				count++
				_ = enc.Encode(Out{Pass: "channel.msg", Message: buildMsgInfo(mm, chMap, uMap)})
			}
		case *tg.MessagesMessages:
			// rare for channels
			for _, m := range x.Messages {
				if mm, ok := m.(*tg.Message); ok {
					lastID = mm.ID
					count++
					_ = enc.Encode(Out{Pass: "channel.msg", Message: buildMsgInfo(mm, chMap, uMap)})
				}
			}
		}
		if count == 0 {
			break
		}
		pulled += count
		offsetID = lastID
		time.Sleep(250 * time.Millisecond)
	}
}
