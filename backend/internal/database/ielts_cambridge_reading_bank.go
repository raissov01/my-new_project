package database

import (
	"fmt"

	"github.com/midoriya/flashlearn-backend/internal/models"
)

// cq is a compact question definition used only within this file.
type cq struct {
	T    string   // type: tfn ynng sc summ mh mc sa
	P    string   // prompt
	A    string   // answer
	E    string   // explanation
	Opts []string // options for mc/mh (nil otherwise)
}

func expandQType(t string) string {
	switch t {
	case "tfn":
		return "true_false_not_given"
	case "ynng":
		return "yes_no_not_given"
	case "sc":
		return "sentence_completion"
	case "summ":
		return "summary_completion"
	case "mh":
		return "matching_headings"
	case "mc":
		return "multiple_choice"
	case "sa":
		return "short_answer"
	}
	return t
}

func cqOptsList(t string, opts []string) *string {
	switch t {
	case "tfn":
		return readingOpts([]string{"True", "False", "Not Given"})
	case "ynng":
		return readingOpts([]string{"Yes", "No", "Not Given"})
	default:
		if len(opts) == 0 {
			return nil
		}
		return readingOpts(opts)
	}
}

// expandReading converts a []cq into full IELTSQuestion records for one passage.
// passage is 1, 2 or 3. Sort offsets: P1→+1..+13, P2→+14..+26, P3→+27..+40.
func expandReading(examSet, title, topic, difficulty string, passage int,
	content string, bt *string, sortBase int, qs []cq) []models.IELTSQuestion {

	offsets := [3]int{1, 14, 27}
	base := sortBase + offsets[passage-1]
	group := fmt.Sprintf("%s-reading-passage-%d", examSet, passage)
	c := stringPtr(content)

	out := make([]models.IELTSQuestion, 0, len(qs))
	for i, q := range qs {
		out = append(out, models.IELTSQuestion{
			Section:       "reading",
			MockType:      "cambridge_style",
			ExamSet:       examSet,
			QuestionGroup: group,
			QuestionType:  expandQType(q.T),
			Title:         title,
			Topic:         topic,
			Content:       c,
			BandTarget:    bt,
			Prompt:        q.P,
			Answer:        stringPtr(q.A),
			Explanation:   stringPtr(q.E),
			Options:       cqOptsList(q.T, q.Opts),
			SortOrder:     base + i,
			Difficulty:    difficulty,
			PassageNumber: passage,
		})
	}
	return out
}

// buildCambridgeExtendedReadingBank returns ~200 reading questions for Cambridge 12–16.
func buildCambridgeExtendedReadingBank() []models.IELTSQuestion {
	var all []models.IELTSQuestion
	all = append(all, buildC12Reading()...)
	all = append(all, buildC13Reading()...)
	all = append(all, buildC14Reading()...)
	all = append(all, buildC15Reading()...)
	all = append(all, buildC16Reading()...)
	return all
}

// ─────────────────────────────────────────────────────────────────────────────
// Cambridge 12  —  sortBase 13 000
// ─────────────────────────────────────────────────────────────────────────────

func buildC12Reading() []models.IELTSQuestion {
	const (
		examSet  = "cambridge-12-test-1"
		sortBase = 13000
	)
	bt := stringPtr("6.5")
	var all []models.IELTSQuestion

	// ── P1: Biomimicry (easy) 5TFN+4SC+4SUMM ─────────────────────────────────
	all = append(all, expandReading(examSet, "Biomimicry", "Life Sciences", "easy", 1,
		`Biomimicry is the practice of learning from and imitating natural systems to solve human engineering challenges. The term was popularised by biologist Janine Benyus in her 1997 book, which argued that nature's 3.8 billion years of evolutionary trial and error represent an unmatched repository of design solutions.

One of the most celebrated examples is Velcro. Swiss engineer George de Mestral noticed how burdock burrs clung to his dog's fur. Microscopic examination revealed tiny hooks that latched onto fabric loops. His 1955 patent created a fastening system used worldwide. The kingfisher's streamlined beak later inspired engineers at Japan Railways to redesign the Shinkansen bullet-train nose, reducing aerodynamic noise by fifteen percent and energy consumption by approximately eleven percent.

Structural colour is another biomimetic frontier. Unlike pigment-based colour, which relies on chemical light absorption, structural colour arises from nanoscale surface features. The Morpho butterfly's wings use such structures to produce iridescent blue without pigment. Researchers have mimicked this mechanism to create paints and displays that resist fading.

In architecture, Zimbabwe's Eastgate Centre drew inspiration from termite mounds that maintain stable internal temperatures despite extreme external heat. Its passive ventilation system requires no conventional air conditioning and uses ninety percent less energy than comparable buildings.

Spider silk, stronger than steel by weight, inspires synthetic alternatives for medical sutures and aerospace materials. Critics caution that biological systems evolved under constraints very different from industrial requirements, and direct imitation without understanding the full ecological context can yield incomplete solutions.`,
		bt, sortBase, []cq{
			{"tfn", "The term 'biomimicry' was popularised by Janine Benyus in 1997.", "True", "The passage states the term was 'popularised by biologist Janine Benyus in her 1997 book'.", nil},
			{"tfn", "George de Mestral developed Velcro after observing insects on his clothing.", "False", "The passage says he observed burdock burrs, not insects.", nil},
			{"tfn", "The Shinkansen nose redesign reduced aerodynamic noise by fifteen percent.", "True", "The passage explicitly states 'reducing aerodynamic noise by fifteen percent'.", nil},
			{"tfn", "Structural colour relies on chemical pigments to produce colour.", "False", "The passage states structural colour 'arises from nanoscale surface features', not pigments.", nil},
			{"tfn", "The Eastgate Centre is located in Zimbabwe.", "True", "The passage explicitly states 'Zimbabwe's Eastgate Centre'.", nil},
			{"sc", "George de Mestral's Velcro patent was granted in ______.", "1955", "The passage states 'His 1955 patent'.", nil},
			{"sc", "The Shinkansen redesign cut energy consumption by approximately ______ percent.", "eleven", "The passage states 'energy consumption by approximately eleven percent'.", nil},
			{"sc", "The Eastgate Centre uses ______ percent less energy than comparable buildings.", "ninety", "The passage states 'ninety percent less energy than comparable buildings'.", nil},
			{"sc", "The Morpho butterfly's wings inspired research into ______ colour technology.", "structural", "The passage discusses structural colour in relation to the Morpho butterfly.", nil},
			{"summ", "Biomimicry draws on approximately ______ billion years of evolutionary design solutions.", "3.8", "The passage refers to 'nature's 3.8 billion years of evolutionary trial and error'.", nil},
			{"summ", "Spider silk is stronger than ______ by weight and has inspired medical applications.", "steel", "The passage states 'Spider silk, stronger than steel by weight'.", nil},
			{"summ", "Velcro was inspired by observing how ______ clung to a dog's fur.", "burdock burrs", "The passage says 'burdock burrs clung to his dog's fur'.", nil},
			{"summ", "Critics of biomimicry warn that imitation without understanding the full ______ context can yield incomplete solutions.", "ecological", "The passage states 'without understanding the full ecological context'.", nil},
		},
	)...)

	// ── P2: Colour Psychology (medium) 4MH+5MC+4SA ───────────────────────────
	h2 := []string{
		"A) Red's physiological effects and competitive sport",
		"B) Calming colours in medical environments",
		"C) Colour's influence on retail and brand identity",
		"D) Yellow's processing speed and cultural meanings",
	}
	all = append(all, expandReading(examSet, "Colour Psychology", "Psychology", "medium", 2,
		`The psychological effects of colour on human behaviour have been studied since the early twentieth century. Today, colour psychology informs retail design, healthcare, and sports performance, though responses vary with culture and personal history.

Red is physiologically activating. Studies recording heart rate, skin conductance, and cortisol consistently show elevated arousal in red environments. Psychologists Russell Hill and Robert Barton found that athletes wearing red outperformed those in blue in combat events at the 2004 Athens Olympics, though subsequent studies produced mixed results.

Blue and green suggest calm and restoration. Interior designers recommend them for hospital wards, drawing on studies showing reduced pain perception and anxiety in patients. One experiment found surgical teams made fewer errors under blue-tinted lighting than standard white, though critics note these studies often fail to control for brightness and saturation.

Colour also shapes purchasing behaviour. Retailers use warm colours such as orange and yellow to stimulate impulse buying, while cooler tones project reliability. A brand-colour study found blue logos rated as more trustworthy and purple logos as more luxurious, but these associations were stronger in Western than in East Asian participants, illustrating the role of cultural conditioning.

Yellow is processed faster than any other colour because it matches the peak sensitivity of the eye's photoreceptors. This makes it standard for safety equipment and road signs. Researchers now caution that early work relied on small samples and often failed to distinguish between different shades and saturations.`,
		bt, sortBase, []cq{
			{"mh", "Choose the heading for the paragraph beginning 'Red is physiologically activating.'", "A) Red's physiological effects and competitive sport", "The paragraph discusses red's arousal effects and athletics research.", h2},
			{"mh", "Choose the heading for the paragraph beginning 'Blue and green suggest calm and restoration.'", "B) Calming colours in medical environments", "The paragraph focuses on calming effects of blue/green in healthcare.", h2},
			{"mh", "Choose the heading for the paragraph beginning 'Colour also shapes purchasing behaviour.'", "C) Colour's influence on retail and brand identity", "The paragraph discusses colour effects on consumer behaviour and branding.", h2},
			{"mh", "Choose the heading for the paragraph beginning 'Yellow is processed faster than any other colour.'", "D) Yellow's processing speed and cultural meanings", "The paragraph explains yellow's visual priority and significance.", h2},
			{"mc", "What did Hill and Barton's research at the 2004 Athens Olympics demonstrate?", "B) Athletes in red outperformed those in blue in combat events", "The passage states 'athletes wearing red outperformed those in blue in combat events'.", []string{"A) Blue athletes consistently outperformed all other colours", "B) Athletes in red outperformed those in blue in combat events", "C) Colour had no measurable effect on athletic outcomes", "D) Green athletes scored highest across all events"}},
			{"mc", "What criticism is raised about blue-lighting studies in operating theatres?", "C) They fail to control for brightness and saturation levels", "The passage notes they 'fail to control for brightness and saturation'.", []string{"A) Their sample sizes were too small to draw conclusions", "B) No independent laboratory has replicated the results", "C) They fail to control for brightness and saturation levels", "D) Operating theatres already use blue lighting as standard practice"}},
			{"mc", "Which colours stimulate impulse buying according to the passage?", "D) Orange and yellow", "The passage states 'warm colours such as orange and yellow to stimulate impulse buying'.", []string{"A) Blue and purple", "B) Green and teal", "C) Red and white", "D) Orange and yellow"}},
			{"mc", "How did East Asian participants differ from Western ones in brand-colour associations?", "B) They had weaker associations between blue logos and trustworthiness", "The passage says these associations 'were stronger in Western than in East Asian participants'.", []string{"A) They rated blue logos as significantly more trustworthy", "B) They had weaker associations between blue logos and trustworthiness", "C) They showed a strong preference for purple logos", "D) They showed no colour-brand associations at all"}},
			{"mc", "Why is yellow processed faster than other colours?", "A) It matches the peak sensitivity of the eye's photoreceptors", "The passage states it 'matches the peak sensitivity of the eye's photoreceptors'.", []string{"A) It matches the peak sensitivity of the eye's photoreceptors", "B) It has the highest frequency in the visible spectrum", "C) It produces stronger contrast against dark backgrounds", "D) It activates both rod and cone pathways simultaneously"}},
			{"sa", "Which two psychologists studied colour and athletic performance at the 2004 Athens Olympics?", "Russell Hill and Robert Barton", "The passage names 'Psychologists Russell Hill and Robert Barton'.", nil},
			{"sa", "In what year did the Athens Olympics studied by Hill and Barton take place?", "2004", "The passage refers to 'the 2004 Athens Olympics'.", nil},
			{"sa", "Which colour of logo was associated with luxury in the brand-perception study?", "purple", "The passage states 'purple logos as more luxurious'.", nil},
			{"sa", "What does the difference in colour associations between East Asian and Western participants illustrate?", "the role of cultural conditioning", "The passage states this 'illustrating the role of cultural conditioning'.", nil},
		},
	)...)

	// ── P3: Cryopreservation (hard) 5YNNG+5MC+4SC ────────────────────────────
	all = append(all, expandReading(examSet, "Cryopreservation", "Biology & Medicine", "hard", 3,
		`Cryopreservation stores biological material at extremely low temperatures to halt metabolic activity and prevent decay. The most common target is around minus 196 degrees Celsius, achieved by immersion in liquid nitrogen, at which point chemical reactions effectively cease.

The first successful cryopreservation of human cells occurred in 1949, when British reproductive biologist Christopher Polge discovered that glycerol protects sperm cells from freezing damage. Glycerol works as a cryoprotectant by replacing intracellular water, preventing ice crystals that would otherwise rupture cell membranes.

Vitrification, a rapid cooling technique, has largely replaced slower protocols for embryos and eggs. Rather than forming ice crystals, it transforms cell water into a glass-like amorphous state. Vitrified embryos now achieve success rates comparable to or better than fresh embryos in fertility clinics.

In conservation, the San Diego Zoo's Frozen Zoo stores genetic material from more than ten thousand individual animals representing over one thousand species. Critics argue that cryopreservation does not address habitat destruction and that resources might be better directed toward in-situ conservation.

The Svalbard Global Seed Vault, established in 2008 on a Norwegian Arctic island, holds over 1.3 million seed samples. In 2017, permafrost warming linked to climate change caused minor water ingress, prompting engineering modifications.

Despite these achievements, cryopreservation of whole organs for transplantation remains problematic. The cryoprotectant concentrations required to prevent ice formation across billions of diverse cells are often toxic at the organ level, and researchers are investigating magnetic nanoparticle rewarming as a potential solution.`,
		bt, sortBase, []cq{
			{"ynng", "Cryopreservation stores material at approximately minus 196 degrees Celsius.", "Yes", "The passage states 'around minus 196 degrees Celsius, achieved by immersion in liquid nitrogen'.", nil},
			{"ynng", "Glycerol damages cells by promoting ice crystal formation.", "No", "The passage says glycerol works by 'preventing ice crystals'—the opposite effect.", nil},
			{"ynng", "Vitrification is a slower cooling technique than standard freezing protocols.", "No", "The passage calls it 'a rapid cooling technique' that replaced slower protocols.", nil},
			{"ynng", "The San Diego Zoo's Frozen Zoo stores material from more than ten thousand individual animals.", "Yes", "The passage explicitly states 'more than ten thousand individual animals'.", nil},
			{"ynng", "The Svalbard Seed Vault has experienced no structural problems since its opening.", "No", "The passage states that in 2017 'permafrost warming caused minor water ingress'.", nil},
			{"mc", "What is the primary function of glycerol as a cryoprotectant?", "B) It replaces intracellular water, preventing ice crystal formation", "The passage states glycerol works 'by replacing intracellular water, preventing ice crystals'.", []string{"A) It lowers the temperature of liquid nitrogen further", "B) It replaces intracellular water, preventing ice crystal formation", "C) It accelerates the rate of cellular freezing", "D) It destroys pathogens during cryogenic storage"}},
			{"mc", "What does vitrification produce instead of ice crystals?", "C) A glass-like amorphous state", "The passage states it 'transforms cell water into a glass-like amorphous state'.", []string{"A) Protective microcrystals that melt slowly on rewarming", "B) A liquid state maintained at ultra-low temperature", "C) A glass-like amorphous state", "D) A rigid crystalline lattice stronger than conventional ice"}},
			{"mc", "What is the main criticism of cryopreservation for endangered species?", "A) It does not address the habitat destruction driving extinction", "The passage states it 'does not address habitat destruction'.", []string{"A) It does not address the habitat destruction driving extinction", "B) Success rates for animal cells are too low to be useful", "C) Maintaining the facilities is prohibitively expensive", "D) The technique only works reliably for plant material"}},
			{"mc", "What caused water ingress at the Svalbard Seed Vault in 2017?", "D) Permafrost warming linked to climate change", "The passage states 'permafrost warming linked to climate change caused minor water ingress'.", []string{"A) A flaw in the original drainage system design", "B) An exceptionally heavy winter storm", "C) A minor seismic event in the region", "D) Permafrost warming linked to climate change"}},
			{"mc", "Why does whole-organ cryopreservation remain problematic?", "C) The cryoprotectant concentrations needed are often toxic at the organ level", "The passage states these concentrations 'are often toxic at the organ level'.", []string{"A) Organs are too large to be placed in liquid nitrogen containers", "B) The cooling process must proceed too slowly for organs to survive intact", "C) The cryoprotectant concentrations needed are often toxic at the organ level", "D) There are insufficient cold-storage facilities worldwide for organ banking"}},
			{"sc", "Cryopreservation stores material at around minus ______ degrees Celsius.", "196", "The passage states 'around minus 196 degrees Celsius'.", nil},
			{"sc", "Christopher Polge discovered in 1949 that ______ could protect sperm cells from freezing damage.", "glycerol", "The passage states 'Polge discovered that glycerol protects sperm cells'.", nil},
			{"sc", "The Svalbard Global Seed Vault was established in ______.", "2008", "The passage states 'established in 2008 on a Norwegian Arctic island'.", nil},
			{"sc", "The San Diego Zoo's Frozen Zoo holds material from over ______ species.", "one thousand", "The passage states 'over one thousand species'.", nil},
		},
	)...)

	return all
}

// ─────────────────────────────────────────────────────────────────────────────
// Cambridge 13  —  sortBase 14 000
// ─────────────────────────────────────────────────────────────────────────────

func buildC13Reading() []models.IELTSQuestion {
	const (
		examSet  = "cambridge-13-test-1"
		sortBase = 14000
	)
	bt := stringPtr("6.5")
	var all []models.IELTSQuestion

	// ── P1: Urban Vertical Farming (easy) 5TFN+4SC+4SUMM ─────────────────────
	all = append(all, expandReading(examSet, "Urban Vertical Farming", "Agriculture & Technology", "easy", 1,
		`Vertical farming is the practice of growing crops in stacked layers inside controlled indoor environments. The concept was popularised by ecologist Dickson Despommier of Columbia University, who first outlined the idea in 1999, arguing that urban food production could reduce the environmental burden of conventional agriculture.

Vertical farms use artificial LED lighting, eliminating dependence on natural sunlight and making locations independent of seasonal weather. This allows year-round crop production regardless of external climate conditions. Because these facilities operate in sealed environments with recirculating water systems, they typically use approximately ninety-five percent less water than equivalent soil-based farms.

The absence of open fields also removes the need for chemical pesticides, since insect pests and plant pathogens cannot easily enter the controlled environment. This reduces chemical inputs and can shorten the distance between production and consumer, since vertical farms can be established within cities.

The first commercial vertical farm opened in Japan in 2004, and the sector has grown rapidly since, with major facilities now operating across Asia, Europe, and North America. However, high initial capital investment remains the principal barrier to expansion, as the cost of constructing facilities, installing LED arrays, and implementing climate-control systems is substantially greater than that of building conventional greenhouses or preparing agricultural land.

Energy consumption is also a concern, since replacing natural sunlight with artificial lighting across large areas demands significant electricity. Advocates argue that as renewable energy costs fall, this challenge will diminish, but critics note that the sector's overall carbon footprint depends heavily on the regional energy mix.`,
		bt, sortBase, []cq{
			{"tfn", "Dickson Despommier first outlined the concept of vertical farming in 1999.", "True", "The passage states he 'first outlined the idea in 1999'.", nil},
			{"tfn", "Vertical farms use approximately ninety-five percent less water than equivalent soil-based farms.", "True", "The passage explicitly states 'approximately ninety-five percent less water'.", nil},
			{"tfn", "The first commercial vertical farm was opened in the United States.", "False", "The passage states it opened 'in Japan in 2004'.", nil},
			{"tfn", "Vertical farms eliminate pesticide use entirely because insects cannot enter.", "True", "The passage states that 'insect pests and plant pathogens cannot easily enter the controlled environment'.", nil},
			{"tfn", "High initial capital investment is identified as the main barrier to vertical farming expansion.", "True", "The passage calls it 'the principal barrier to expansion'.", nil},
			{"sc", "Dickson Despommier first proposed vertical farming while at ______ University.", "Columbia", "The passage states he was 'of Columbia University'.", nil},
			{"sc", "Vertical farms use ______ lighting, eliminating reliance on natural sunlight.", "LED", "The passage states they 'use artificial LED lighting'.", nil},
			{"sc", "The first commercial vertical farm opened in ______ in 2004.", "Japan", "The passage states 'The first commercial vertical farm opened in Japan in 2004'.", nil},
			{"sc", "Vertical farms typically use approximately ______ percent less water than soil-based farms.", "ninety-five", "The passage states 'approximately ninety-five percent less water'.", nil},
			{"summ", "Vertical farms can operate year-round because they are not dependent on ______ conditions.", "external climate / seasonal weather", "The passage states they allow 'year-round crop production regardless of external climate conditions'.", nil},
			{"summ", "Because vertical farms use sealed environments, they do not require chemical ______.", "pesticides", "The passage states this 'removes the need for chemical pesticides'.", nil},
			{"summ", "The main drawback of vertical farming at present is the high ______ required to build and equip facilities.", "capital investment", "The passage identifies 'high initial capital investment' as the main barrier.", nil},
			{"summ", "Vertical farming could become more energy-efficient as the cost of ______ energy decreases.", "renewable", "The passage mentions 'as renewable energy costs fall'.", nil},
		},
	)...)

	// ── P2: Cognitive Biases (medium) 4MH+5MC+4SA ────────────────────────────
	h2 := []string{
		"A) Two contrasting modes of human thinking",
		"B) Why the first number disproportionately shapes judgment",
		"C) Loss aversion and the asymmetry of gains and losses",
		"D) Cognitive biases and errors in medical diagnosis",
	}
	all = append(all, expandReading(examSet, "Cognitive Biases", "Psychology", "medium", 2,
		`Cognitive biases are systematic patterns of deviation from rational thinking that affect human decision-making. Psychologist Daniel Kahneman distinguished two modes of thought: System 1, which is fast, automatic, and largely unconscious, and System 2, which is slow, deliberate, and analytical. Many cognitive biases arise because people default to System 1 when System 2 would be more appropriate.

The anchoring effect describes the tendency to rely disproportionately on the first piece of information encountered when making a judgment. In one classic experiment, participants asked to estimate African nations' share of United Nations membership gave higher answers if a spinning wheel had first stopped on a high number, even though the wheel spin was clearly random. The first number served as an anchor that pulled all subsequent estimates in its direction.

Loss aversion, identified by Kahneman and Amos Tversky, is the finding that losses feel approximately twice as painful as equivalent gains feel pleasant. This asymmetry influences everything from financial decisions to policy compliance: people work harder to avoid losing something they already have than to acquire an equal benefit.

The Dunning-Kruger effect describes a separate phenomenon: individuals with limited knowledge in a domain tend to overestimate their own competence, while genuine experts often underestimate theirs. This occurs because accurately assessing a skill requires the same knowledge as performing it; beginners lack both the skill and the meta-cognitive tools to recognise their deficiency.

In healthcare, cognitive biases contribute to diagnostic errors. Availability bias leads physicians to favour diagnoses that come easily to mind, often based on recent experience rather than probability. Recognition of these biases has prompted the adoption of structured diagnostic frameworks and cognitive-debiasing training in medical education.`,
		bt, sortBase, []cq{
			{"mh", "Choose the heading for the paragraph beginning 'Cognitive biases are systematic patterns of deviation…'", "A) Two contrasting modes of human thinking", "The paragraph introduces Kahneman's System 1 and System 2 framework.", h2},
			{"mh", "Choose the heading for the paragraph beginning 'The anchoring effect describes…'", "B) Why the first number disproportionately shapes judgment", "The paragraph explains how an initial number anchors subsequent estimates.", h2},
			{"mh", "Choose the heading for the paragraph beginning 'Loss aversion, identified by Kahneman and Amos Tversky…'", "C) Loss aversion and the asymmetry of gains and losses", "The paragraph discusses loss aversion and its effects on decision-making.", h2},
			{"mh", "Choose the heading for the paragraph beginning 'In healthcare, cognitive biases contribute…'", "D) Cognitive biases and errors in medical diagnosis", "The paragraph discusses how biases affect medical diagnosis.", h2},
			{"mc", "How does System 1 thinking differ from System 2?", "B) System 1 is fast, automatic, and largely unconscious", "The passage states System 1 is 'fast, automatic, and largely unconscious'.", []string{"A) System 1 is slower and more deliberate than System 2", "B) System 1 is fast, automatic, and largely unconscious", "C) System 1 operates only during complex analytical tasks", "D) System 2 is faster and more intuitive than System 1"}},
			{"mc", "What does the anchoring effect describe?", "C) The tendency to rely disproportionately on the first piece of information encountered", "The passage defines it as relying 'disproportionately on the first piece of information'.", []string{"A) The tendency to seek information confirming existing beliefs", "B) The tendency to overestimate one's own competence in a domain", "C) The tendency to rely disproportionately on the first piece of information encountered", "D) The preference for immediate rewards over equivalent future rewards"}},
			{"mc", "According to Kahneman and Tversky, losses feel approximately how much more painful than equivalent gains?", "B) About twice as painful", "The passage states losses 'feel approximately twice as painful as equivalent gains feel pleasant'.", []string{"A) Equal in emotional weight to equivalent gains", "B) About twice as painful", "C) About five times as painful", "D) About ten times more significant"}},
			{"mc", "What does the Dunning-Kruger effect describe?", "D) People with limited knowledge overestimate their competence", "The passage states 'individuals with limited knowledge tend to overestimate their own competence'.", []string{"A) The tendency to follow the behaviour of those around us", "B) The difficulty of recalling recent events accurately under stress", "C) The preference for immediate rather than delayed gratification", "D) People with limited knowledge overestimate their competence"}},
			{"mc", "What is availability bias in the medical context?", "A) Favouring diagnoses that come easily to mind based on recent experience", "The passage states availability bias 'leads physicians to favour diagnoses that come easily to mind, often based on recent experience'.", []string{"A) Favouring diagnoses that come easily to mind based on recent experience", "B) Assuming patients are healthier than they actually are", "C) Over-relying on laboratory data rather than clinical observation", "D) Preferring treatments that were used successfully in the recent past"}},
			{"sa", "What is the name of the researcher who collaborated with Kahneman to identify loss aversion?", "Amos Tversky", "The passage states 'Kahneman and Amos Tversky'.", nil},
			{"sa", "By approximately what factor do losses outweigh equivalent gains, according to the passage?", "twice", "The passage states 'approximately twice as painful'.", nil},
			{"sa", "What is the term for the pattern where individuals with limited knowledge overestimate their competence?", "Dunning-Kruger effect", "The passage names this 'The Dunning-Kruger effect'.", nil},
			{"sa", "What two measures have been adopted in medicine to counter the effects of cognitive biases?", "structured diagnostic frameworks and cognitive-debiasing training", "The passage states 'structured diagnostic frameworks and cognitive-debiasing training'.", nil},
		},
	)...)

	// ── P3: Deep-Sea Mining (hard) 5YNNG+5MC+4SC ─────────────────────────────
	all = append(all, expandReading(examSet, "Deep-Sea Mining", "Environment & Resources", "hard", 3,
		`The deep ocean floor contains vast mineral deposits that have attracted increasing commercial interest. Polymetallic nodules—potato-sized concretions containing manganese, cobalt, copper, and nickel—litter the sediment of the abyssal plain across millions of square kilometres. The most extensively studied area is the Clarion-Clipperton Zone in the central Pacific Ocean, which holds an estimated resource larger than all known land-based deposits of these metals combined.

These minerals are critical for manufacturing the batteries used in electric vehicles and renewable energy storage systems, creating pressure to exploit deep-sea resources as demand for low-carbon technologies rises. Polymetallic nodules form over millions of years through the slow accretion of dissolved metals around a nucleus, meaning that once removed they cannot be replenished on any human timescale.

The International Seabed Authority, established under the United Nations Convention on the Law of the Sea, regulates exploration and exploitation of mineral resources in international waters. By 2023 it had issued exploration licences to more than thirty contractors, though commercially viable extraction operations had not yet commenced.

Deep-sea ecosystems are among the least explored on Earth. They support unique fauna adapted to extreme pressure, near-freezing temperatures, and perpetual darkness, often concentrated around hydrothermal vents and cold-water seeps. Mining operations would destroy the seafloor habitat directly under the collection equipment and generate sediment plumes that could smother filter feeders across wide areas, disrupting food webs that depend on the slow settling of organic particles from the surface.

Environmental groups argue that exploitation should not begin until the ecological consequences are fully understood, while industry representatives contend that the environmental impact of deep-sea mining could be lower than that of equivalent terrestrial extraction.`,
		bt, sortBase, []cq{
			{"ynng", "Polymetallic nodules contain manganese, cobalt, copper, and nickel.", "Yes", "The passage lists these metals explicitly.", nil},
			{"ynng", "The Clarion-Clipperton Zone is located in the Atlantic Ocean.", "No", "The passage states it is 'in the central Pacific Ocean'.", nil},
			{"ynng", "Polymetallic nodules form over millions of years through slow accretion.", "Yes", "The passage states 'form over millions of years through the slow accretion of dissolved metals'.", nil},
			{"ynng", "Commercially viable deep-sea mining operations were underway by 2023.", "No", "The passage states 'commercially viable extraction operations had not yet commenced'.", nil},
			{"ynng", "Environmental groups believe exploitation should not begin until ecological consequences are fully understood.", "Yes", "The passage states this is the position of environmental groups.", nil},
			{"mc", "Why are polymetallic nodule minerals especially sought after at present?", "B) They are critical for manufacturing batteries for electric vehicles and renewable energy storage", "The passage states these minerals 'are critical for manufacturing the batteries used in electric vehicles and renewable energy storage'.", []string{"A) They are used in the production of conventional fossil fuels", "B) They are critical for manufacturing batteries for electric vehicles and renewable energy storage", "C) They are needed for building deep-sea exploration vessels", "D) They are the only known sources of manganese on Earth"}},
			{"mc", "What is the International Seabed Authority?", "C) The body that regulates mineral extraction in international waters under UN law", "The passage states it 'regulates exploration and exploitation of mineral resources in international waters'.", []string{"A) A private company that holds exclusive mining rights in the Pacific", "B) A scientific body that monitors deep-sea ecosystem health", "C) The body that regulates mineral extraction in international waters under UN law", "D) An intergovernmental fund that finances deep-sea research expeditions"}},
			{"mc", "What environmental harm could be caused by sediment plumes from mining?", "D) Smothering filter feeders and disrupting food webs across wide areas", "The passage states plumes 'could smother filter feeders across wide areas, disrupting food webs'.", []string{"A) Raising seawater temperatures significantly around the mining site", "B) Introducing invasive species into deep-sea environments", "C) Depleting dissolved oxygen in surface waters above the mining area", "D) Smothering filter feeders and disrupting food webs across wide areas"}},
			{"mc", "Why cannot polymetallic nodules be replenished on a human timescale?", "A) They form through a process that takes millions of years", "The passage states they 'form over millions of years'.", []string{"A) They form through a process that takes millions of years", "B) The chemical compounds they require no longer exist in seawater", "C) Underwater currents move them away from their original locations", "D) They dissolve when exposed to the pressure of mining equipment"}},
			{"mc", "How many exploration licences had the International Seabed Authority issued by 2023?", "C) More than thirty", "The passage states 'more than thirty contractors'.", []string{"A) Fewer than ten", "B) Exactly twenty", "C) More than thirty", "D) Over one hundred"}},
			{"sc", "The Clarion-Clipperton Zone is located in the central ______ Ocean.", "Pacific", "The passage states 'the central Pacific Ocean'.", nil},
			{"sc", "Polymetallic nodules form over ______ of years through slow accretion.", "millions", "The passage states 'form over millions of years'.", nil},
			{"sc", "The International Seabed Authority was established under the United Nations Convention on the Law of the ______.", "Sea", "The passage states this convention.", nil},
			{"sc", "Mining would generate ______ plumes that could smother deep-sea filter feeders.", "sediment", "The passage states 'generate sediment plumes'.", nil},
		},
	)...)

	return all
}

// ─────────────────────────────────────────────────────────────────────────────
// Cambridge 14  —  sortBase 15 000
// ─────────────────────────────────────────────────────────────────────────────

func buildC14Reading() []models.IELTSQuestion {
	const (
		examSet  = "cambridge-14-test-1"
		sortBase = 15000
	)
	bt := stringPtr("7.0")
	var all []models.IELTSQuestion

	// ── P1: Human Microbiome (easy) 5TFN+4SC+4SUMM ───────────────────────────
	all = append(all, expandReading(examSet, "The Human Microbiome", "Biology & Health", "easy", 1,
		`The human body harbours approximately 38 trillion microbial cells, a number roughly comparable to the total count of human cells. These microorganisms—bacteria, archaea, viruses, and fungi—collectively form the microbiome, and they play roles in digestion, immune regulation, and even mental health. The gut alone hosts around one thousand distinct bacterial species, making it the most densely colonised organ.

Disruption of normal microbial balance, called dysbiosis, has been linked to conditions including obesity, type-2 diabetes, inflammatory bowel disease, and depression. Germ-free mice raised without any microbiome develop abnormal immune responses and heightened anxiety-like behaviours, suggesting the microbiome is integral to normal physiology from early life.

The first one thousand days after birth are critical for microbiome development. Vaginally delivered infants acquire microbes from the birth canal, and breastfeeding further shapes the community. Breast-fed infants have markedly different microbiome compositions from formula-fed counterparts. Early antibiotic use can disrupt this developing community in ways that persist for months or years.

Fecal microbiota transplantation, which transfers stool from a healthy donor into a recipient's gut, has proven highly effective against recurrent Clostridioides difficile infections resistant to conventional antibiotics. Success rates in clinical trials have exceeded ninety percent. Researchers are exploring whether transplantation could also help patients with inflammatory bowel disease and metabolic conditions, though results remain more mixed.

The prospect of precision microbiome medicine—tailoring interventions to an individual's microbial profile—represents a significant area of ongoing research, though scientific and regulatory hurdles remain considerable.`,
		bt, sortBase, []cq{
			{"tfn", "The human body contains approximately 38 trillion microbial cells.", "True", "The passage states 'approximately 38 trillion microbial cells'.", nil},
			{"tfn", "The gut hosts fewer than one hundred distinct bacterial species.", "False", "The passage states 'around one thousand distinct bacterial species'.", nil},
			{"tfn", "Dysbiosis has been linked to conditions including obesity and depression.", "True", "The passage lists 'obesity, type-2 diabetes, inflammatory bowel disease, and depression'.", nil},
			{"tfn", "Fecal microbiota transplantation is primarily used to treat respiratory infections.", "False", "The passage states it is used against 'Clostridioides difficile infections'.", nil},
			{"tfn", "The first thousand days after birth are considered critical for microbiome development.", "True", "The passage explicitly states this.", nil},
			{"sc", "The gut hosts approximately ______ distinct bacterial species.", "one thousand", "The passage states 'around one thousand distinct bacterial species'.", nil},
			{"sc", "Disruption of normal microbial balance is called ______.", "dysbiosis", "The passage defines this state as 'dysbiosis'.", nil},
			{"sc", "Breast-fed infants have different microbiome compositions from ______-fed counterparts.", "formula", "The passage compares 'breast-fed infants' with 'formula-fed counterparts'.", nil},
			{"sc", "Clinical trials of fecal microbiota transplantation have reported success rates exceeding ______ percent.", "ninety", "The passage states 'Success rates in clinical trials have exceeded ninety percent'.", nil},
			{"summ", "The number of microbial cells in the body is roughly ______ to the number of human cells.", "comparable", "The passage states 'roughly comparable to the total count of human cells'.", nil},
			{"summ", "Studies on germ-free mice suggest the microbiome is integral to both immune function and normal ______ from early life.", "physiology", "The passage states 'integral to normal physiology from early life'.", nil},
			{"summ", "Early antibiotic use can disrupt the microbiome in ways that persist for ______ or years.", "months", "The passage states 'persist for months or years'.", nil},
			{"summ", "Future microbiome medicine may involve tailoring interventions to each individual's specific ______ profile.", "microbial", "The passage refers to 'an individual's microbial profile'.", nil},
		},
	)...)

	// ── P2: History of Concrete (medium) 4MH+5MC+4SA ─────────────────────────
	h2c14 := []string{
		"A) Ancient Roman innovations in building material",
		"B) The nineteenth-century breakthrough in modern cement",
		"C) Combining concrete with metal for greater strength",
		"D) The environmental cost of concrete production",
	}
	all = append(all, expandReading(examSet, "The History of Concrete", "Engineering & History", "medium", 2,
		`Concrete is the most widely used construction material in the world by volume. The ancient Romans developed a durable form by mixing lime with pozzolana, a volcanic ash found around the Bay of Naples. This mixture reacted chemically with seawater to form an exceptionally strong, crack-resistant material. The Pantheon, completed around 125 CE, features the world's largest unreinforced concrete dome, which remains structurally intact today.

After the fall of the Roman Empire, knowledge of quality concrete largely disappeared in Europe for centuries. The modern era began in 1824 when English bricklayer Joseph Aspdin patented Portland cement, produced by burning limestone and clay at high temperature and grinding the product into a fine powder. When mixed with water, Portland cement hydrates into a hard mineral mass. Its versatility and low cost made it the dominant binder in construction worldwide.

Concrete is strong in compression but weak in tension. In 1854, English inventor William Wilkinson embedded iron bars in a concrete floor slab to counteract this weakness, creating reinforced concrete. Engineers subsequently developed systematic methods for calculating the required amount and placement of steel reinforcement.

Concrete production now accounts for approximately eight percent of global carbon dioxide emissions. This has driven research into alternatives such as geopolymer concrete, which uses industrial by-products like fly ash instead of Portland cement, and supplementary cementitious materials that reduce clinker content.`,
		bt, sortBase, []cq{
			{"mh", "Choose the heading for the paragraph beginning 'Concrete is the most widely used construction material…'", "A) Ancient Roman innovations in building material", "The paragraph covers Roman concrete and the Pantheon.", h2c14},
			{"mh", "Choose the heading for the paragraph beginning 'After the fall of the Roman Empire…'", "B) The nineteenth-century breakthrough in modern cement", "The paragraph discusses Aspdin's 1824 Portland cement patent.", h2c14},
			{"mh", "Choose the heading for the paragraph beginning 'Concrete is strong in compression but weak in tension.'", "C) Combining concrete with metal for greater strength", "The paragraph discusses reinforced concrete invented by Wilkinson.", h2c14},
			{"mh", "Choose the heading for the paragraph beginning 'Concrete production now accounts for approximately eight percent…'", "D) The environmental cost of concrete production", "The paragraph discusses concrete's carbon footprint and greener alternatives.", h2c14},
			{"mc", "What made Roman concrete especially durable?", "B) The addition of pozzolana volcanic ash that reacted chemically with water", "The passage states it mixed lime with pozzolana, which 'reacted chemically with seawater'.", []string{"A) The use of steel reinforcement bars within the mix", "B) The addition of pozzolana volcanic ash that reacted chemically with water", "C) A special high-temperature treatment applied after setting", "D) The exclusive use of seawater rather than fresh water in the mixing process"}},
			{"mc", "In what year did Joseph Aspdin patent Portland cement?", "C) 1824", "The passage states 'In 1824 when English bricklayer Joseph Aspdin patented Portland cement'.", []string{"A) 1793", "B) 1812", "C) 1824", "D) 1854"}},
			{"mc", "Who embedded iron bars in concrete to create reinforced concrete?", "D) William Wilkinson", "The passage states 'English inventor William Wilkinson embedded iron bars'.", []string{"A) Joseph Aspdin", "B) Vitruvius", "C) Robert Stephenson", "D) William Wilkinson"}},
			{"mc", "What proportion of global CO₂ emissions does concrete production contribute?", "B) About eight percent", "The passage states 'approximately eight percent'.", []string{"A) About two percent", "B) About eight percent", "C) About fifteen percent", "D) About twenty-five percent"}},
			{"mc", "What does geopolymer concrete use instead of Portland cement?", "A) Industrial by-products such as fly ash", "The passage states 'uses industrial by-products like fly ash instead of Portland cement'.", []string{"A) Industrial by-products such as fly ash", "B) Carbon-fibre reinforcement instead of steel bars", "C) Volcanic ash imported from Italy", "D) A Roman formula recovered by archaeologists"}},
			{"sa", "In approximately what year was the Pantheon dome completed?", "125 CE", "The passage states 'completed around 125 CE'.", nil},
			{"sa", "What volcanic material did the Romans add to lime to make durable concrete?", "pozzolana", "The passage states they mixed lime with 'pozzolana, a volcanic ash'.", nil},
			{"sa", "What structural weakness of concrete did Wilkinson seek to overcome?", "weakness in tension", "The passage states 'weak in tension'.", nil},
			{"sa", "What percentage of global CO₂ does concrete production account for?", "approximately eight percent", "The passage states 'approximately eight percent'.", nil},
		},
	)...)

	// ── P3: The Attention Economy (hard) 5YNNG+5MC+4SC ───────────────────────
	all = append(all, expandReading(examSet, "The Attention Economy", "Technology & Society", "hard", 3,
		`The term "attention economy" was coined by Nobel laureate Herbert Simon in 1971, who observed that a surplus of information creates a scarcity of the attention needed to process it. In the digital age, capturing and holding human attention has become the primary commercial objective of technology companies, whose revenue depends almost entirely on advertising.

The architecture of digital platforms is designed to maximise time spent on them. Infinite scroll—the feature that automatically loads new content as users reach the bottom of a page—was invented by interface designer Aza Raskin. He later estimated the feature wastes approximately 200,000 hours of human attention daily and removed it from his own devices out of regret. Variable reward schedules, identified in the context of slot machines by behaviourist B.F. Skinner, make unpredictable content more compelling than predictable content, generating compulsive checking behaviour.

A Microsoft study published in 2013 found that the average human attention span had fallen from approximately twelve seconds in 2000 to eight seconds, though some researchers have disputed the methodology. Notifications interrupt focused work on average every eleven minutes, and it takes more than twenty minutes to regain full concentration afterward.

Algorithmic curation creates what researchers call filter bubbles: enclosed information environments in which individuals are shown predominantly content confirming their existing beliefs. This deepens political polarisation and reduces exposure to challenging perspectives.

Growing awareness of these issues has prompted calls for regulation, transparency in algorithmic design, and attentional literacy programmes in schools to help young people navigate environments deliberately engineered to capture their focus.`,
		bt, sortBase, []cq{
			{"ynng", "The term 'attention economy' was coined by Herbert Simon in 1971.", "Yes", "The passage states 'coined by Nobel laureate Herbert Simon in 1971'.", nil},
			{"ynng", "Aza Raskin deliberately kept infinite scroll on his own devices after inventing it.", "No", "The passage states he 'removed it from his own devices out of regret'.", nil},
			{"ynng", "All researchers accept the findings of the 2013 Microsoft attention-span study.", "No", "The passage states 'some researchers have disputed the methodology'.", nil},
			{"ynng", "Filter bubbles expose users primarily to views that challenge their existing beliefs.", "No", "The passage states individuals are shown 'content confirming their existing beliefs'.", nil},
			{"ynng", "The passage calls for regulation and algorithmic transparency to address attention economy concerns.", "Yes", "The passage mentions 'calls for regulation, transparency in algorithmic design'.", nil},
			{"mc", "What did Aza Raskin estimate about infinite scroll?", "C) It wastes approximately 200,000 hours of human attention every day", "The passage states he 'estimated the feature wastes approximately 200,000 hours of human attention daily'.", []string{"A) It increases reading speed by up to twenty percent", "B) It reduces the time users need to find relevant content", "C) It wastes approximately 200,000 hours of human attention every day", "D) It was adopted by fewer than half of major social media platforms"}},
			{"mc", "Where were variable reward schedules originally identified?", "B) In the context of slot machines", "The passage states they were 'identified in the context of slot machines'.", []string{"A) In studies of early internet search-engine behaviour", "B) In the context of slot machines", "C) In video games designed for education", "D) In research on television viewing habits"}},
			{"mc", "According to the Microsoft study, by how much did average attention spans fall between 2000 and 2013?", "A) From approximately twelve seconds to eight seconds", "The passage states this explicitly.", []string{"A) From approximately twelve seconds to eight seconds", "B) From twenty seconds to twelve seconds", "C) From twelve minutes to eight minutes", "D) They increased as people adapted to digital information"}},
			{"mc", "What is a filter bubble according to the passage?", "D) An information environment where users see mainly content confirming their existing beliefs", "The passage defines it as an environment 'in which individuals are shown predominantly content confirming their existing beliefs'.", []string{"A) A government tool used to block access to foreign news sources", "B) A software feature that removes offensive content from social feeds", "C) An algorithm designed to slow internet speeds for heavy users", "D) An information environment where users see mainly content confirming their existing beliefs"}},
			{"mc", "Which three responses does the passage mention to address attention economy concerns?", "B) Regulation, algorithmic transparency, and attentional literacy education", "The passage mentions 'regulation, transparency in algorithmic design, and attentional literacy programmes'.", []string{"A) Taxation of platforms, device time limits, and parental controls", "B) Regulation, algorithmic transparency, and attentional literacy education", "C) Platform bans, user age verification, and advertising restrictions", "D) Screen-time apps, content warnings, and digital detox programmes"}},
			{"sc", "The concept of the attention economy was coined by ______ Simon in 1971.", "Herbert", "The passage names 'Nobel laureate Herbert Simon'.", nil},
			{"sc", "Infinite scroll was invented by interface designer Aza ______.", "Raskin", "The passage names 'Aza Raskin'.", nil},
			{"sc", "Algorithm-driven personalised information environments are called ______ bubbles.", "filter", "The passage refers to 'filter bubbles'.", nil},
			{"sc", "Variable reward schedules generate ______ checking behaviour by making content unpredictably rewarding.", "compulsive", "The passage states 'generating compulsive checking behaviour'.", nil},
		},
	)...)

	return all
}

// ─────────────────────────────────────────────────────────────────────────────
// Cambridge 15  —  sortBase 16 000
// ─────────────────────────────────────────────────────────────────────────────

func buildC15Reading() []models.IELTSQuestion {
	const (
		examSet  = "cambridge-15-test-1"
		sortBase = 16000
	)
	bt := stringPtr("7.0")
	var all []models.IELTSQuestion

	// ── P1: Forest Therapy (easy) 5TFN+4SC+4SUMM ─────────────────────────────
	all = append(all, expandReading(examSet, "Forest Therapy", "Health & Environment", "easy", 1,
		`Forest therapy, known in Japanese as shinrin-yoku or "forest bathing", involves slow, mindful immersion in a woodland environment to gain health benefits. The term was coined by Japan's Ministry of Agriculture, Forestry and Fisheries in 1982 as part of a public health initiative. Since then, scientific evidence has accumulated supporting its physiological and psychological benefits.

Researchers have identified phytoncides—antimicrobial volatile compounds released by trees, particularly conifers—as a key mechanism. Studies by immunologist Dr. Qing Li of Nippon Medical School, who published a widely read book on the subject in 2018, found that phytoncide exposure increases the activity of natural killer (NK) cells, immune-system components that target tumour cells and virus-infected cells.

Controlled studies comparing forest and urban walks of equal duration consistently show that forest walkers have lower blood pressure, reduced cortisol levels, and lower heart rate after their walk. These effects persist for several days beyond the walk. Research has also found that forest environments reduce activity in the prefrontal cortex associated with repetitive negative thought.

Japan has formalised this practice with sixty-two official Forest Therapy Bases and Trails, where certified guides lead sessions of measured duration. Similar programmes now operate in South Korea, Finland, and other countries.

Urban-rural mental health comparisons show that city dwellers experience approximately four percent more mental illness than rural residents after controlling for socio-economic factors, pointing to reduced access to natural environments as a contributing factor.`,
		bt, sortBase, []cq{
			{"tfn", "The term 'shinrin-yoku' was coined by Japan's Ministry of Agriculture, Forestry and Fisheries in 1982.", "True", "The passage states this explicitly.", nil},
			{"tfn", "Phytoncides are volatile compounds released by animals living in forests.", "False", "The passage states they are 'compounds released by trees'.", nil},
			{"tfn", "Studies show that forest walks decrease NK cell activity.", "False", "The passage states phytoncides 'increases the activity of natural killer cells'.", nil},
			{"tfn", "Japan has designated sixty-two official Forest Therapy Bases and Trails.", "True", "The passage explicitly states this.", nil},
			{"tfn", "City dwellers experience approximately four percent more mental illness than rural residents.", "True", "The passage states 'approximately four percent more mental illness'.", nil},
			{"sc", "The Japanese term for forest therapy is ______.", "shinrin-yoku", "The passage states 'known in Japanese as shinrin-yoku'.", nil},
			{"sc", "Dr. Qing Li published a book on forest therapy in ______.", "2018", "The passage states 'published a widely read book on the subject in 2018'.", nil},
			{"sc", "Phytoncide exposure increases the activity of natural ______ cells.", "killer", "The passage refers to 'natural killer (NK) cells'.", nil},
			{"sc", "The health benefits of a forest walk, such as lower blood pressure and cortisol, persist for several ______ afterward.", "days", "The passage states 'These effects persist for several days'.", nil},
			{"summ", "Phytoncides are antimicrobial compounds released primarily by ______ trees.", "conifers", "The passage states 'released by trees, particularly conifers'.", nil},
			{"summ", "Forest environments reduce activity in the ______ cortex linked to repetitive negative thinking.", "prefrontal", "The passage states 'reduce activity in the prefrontal cortex'.", nil},
			{"summ", "Japan's Forest Therapy Bases are staffed by ______ guides who lead structured sessions.", "certified", "The passage states 'certified guides lead sessions'.", nil},
			{"summ", "Higher rates of mental illness among urban residents may partly reflect reduced access to ______ environments.", "natural", "The passage refers to 'reduced access to natural environments'.", nil},
		},
	)...)

	// ── P2: History of Vaccination (medium) 4MH+5MC+4SA ──────────────────────
	h2c15 := []string{
		"A) Edward Jenner and the origins of immunisation",
		"B) Eradicating smallpox through global vaccination",
		"C) Controversy and the anti-vaccination movement",
		"D) mRNA technology and the next generation of vaccines",
	}
	all = append(all, expandReading(examSet, "The History of Vaccination", "Medicine & History", "medium", 2,
		`Vaccination is one of the most effective public health interventions ever developed. In 1796 English physician Edward Jenner observed that milkmaids infected with cowpox appeared immune to the far more dangerous smallpox. He inoculated a young boy with cowpox material and demonstrated that the boy was subsequently protected from smallpox. Although Jenner did not understand the immunological mechanisms, his experiment laid the foundation for modern immunology.

Smallpox once killed millions annually and left many survivors permanently scarred or blind. It became the target of a global eradication campaign coordinated by the World Health Organization. Mass vaccination programmes launched in the 1960s drove the virus to extinction in the wild. In 1980, the WHO formally declared smallpox the first and, to date, only human infectious disease to have been eradicated.

The mid-twentieth century brought further milestones. Jonas Salk developed an inactivated polio vaccine in 1955, followed by Albert Sabin's oral live-attenuated vaccine, easier to administer and instrumental in achieving near-eradication of polio worldwide. Herd immunity—the indirect protection gained by unvaccinated individuals when enough of the population is immunised—typically requires coverage of between sixty and ninety percent.

The development of mRNA vaccine technology, deployed in COVID-19 vaccines from 2020, was a conceptual advance. Unlike conventional vaccines that introduce a weakened pathogen or protein fragment, mRNA vaccines instruct cells to produce a protein that triggers an immune response. This platform can be designed and manufactured far more quickly than traditional approaches.

In 1998 a paper by British physician Andrew Wakefield claimed a link between the measles-mumps-rubella vaccine and autism. The paper was retracted after investigations revealed data fabrication, and multiple large-scale studies have found no such association.`,
		bt, sortBase, []cq{
			{"mh", "Choose the heading for the paragraph beginning 'Vaccination is one of the most effective…'", "A) Edward Jenner and the origins of immunisation", "The paragraph describes Jenner's 1796 experiment.", h2c15},
			{"mh", "Choose the heading for the paragraph beginning 'Smallpox once killed millions annually…'", "B) Eradicating smallpox through global vaccination", "The paragraph describes the WHO-led eradication of smallpox.", h2c15},
			{"mh", "Choose the heading for the paragraph beginning 'In 1998 a paper by British physician Andrew Wakefield…'", "C) Controversy and the anti-vaccination movement", "The paragraph discusses the Wakefield fraud and its consequences.", h2c15},
			{"mh", "Choose the heading for the paragraph beginning 'The development of mRNA vaccine technology…'", "D) mRNA technology and the next generation of vaccines", "The paragraph describes mRNA vaccines as a new platform.", h2c15},
			{"mc", "In what year did Edward Jenner conduct his vaccination experiment?", "B) 1796", "The passage states 'In 1796 English physician Edward Jenner'.", []string{"A) 1780", "B) 1796", "C) 1820", "D) 1855"}},
			{"mc", "When did the WHO declare smallpox eradicated?", "C) 1980", "The passage states 'In 1980, the WHO formally declared smallpox… eradicated'.", []string{"A) 1955", "B) 1967", "C) 1980", "D) 1990"}},
			{"mc", "What type of polio vaccine did Jonas Salk develop in 1955?", "A) An inactivated vaccine", "The passage states 'Jonas Salk developed an inactivated polio vaccine'.", []string{"A) An inactivated vaccine", "B) A live-attenuated vaccine", "C) An mRNA vaccine", "D) A recombinant protein vaccine"}},
			{"mc", "What level of population coverage does herd immunity typically require?", "D) Between sixty and ninety percent", "The passage states 'between sixty and ninety percent'.", []string{"A) About twenty percent", "B) About forty percent", "C) At least fifty percent", "D) Between sixty and ninety percent"}},
			{"mc", "What happened to Wakefield's 1998 paper?", "B) It was retracted after data fabrication was discovered", "The passage states 'retracted after investigations revealed data fabrication'.", []string{"A) It won a major scientific award before being questioned", "B) It was retracted after data fabrication was discovered", "C) It was confirmed by subsequent large-scale studies", "D) It was reclassified as a theoretical proposal"}},
			{"sa", "What animal disease did Jenner use to protect against smallpox?", "cowpox", "The passage states Jenner used 'cowpox material'.", nil},
			{"sa", "Which organisation declared smallpox eradicated in 1980?", "the World Health Organization / WHO", "The passage states 'the WHO formally declared'.", nil},
			{"sa", "Who developed the oral live-attenuated polio vaccine?", "Albert Sabin", "The passage states 'Albert Sabin's oral live-attenuated vaccine'.", nil},
			{"sa", "In what year was Wakefield's controversial paper published?", "1998", "The passage states 'In 1998 a paper by British physician Andrew Wakefield'.", nil},
		},
	)...)

	// ── P3: Language Extinction (hard) 5YNNG+5MC+4SC ─────────────────────────
	all = append(all, expandReading(examSet, "Language Extinction", "Linguistics", "hard", 3,
		`Approximately seven thousand languages are spoken in the world today, but this diversity is under severe threat. Linguists estimate that a language disappears every two weeks, and UNESCO projects that roughly half of today's languages could be extinct by the end of the twenty-first century. When a language dies, it takes with it a unique system of categorising the world, oral traditions, and often the only record of a community's ecological knowledge.

The primary driver of language shift is economic. Speakers of minority languages seeking employment, education, or social mobility typically need proficiency in a dominant national or global language. Over two generations, this practical preference can erode daily use of the heritage language until only elderly speakers remain. A language is classified as endangered when fewer than one thousand speakers use it as their primary means of communication.

Language documentation—the systematic recording of grammar, vocabulary, and oral literature before the last speakers die—has emerged as an urgent discipline. Linguists work alongside last speakers using audio and video equipment to create archives that preserve the language even after it ceases to be spoken.

Revitalisation outcomes vary. Welsh grew significantly after the Welsh Language Act of 1993. The Māori language in New Zealand has been stabilised through immersion schools called kura kaupapa. Modern Hebrew was brought back from a liturgical language spoken by almost no one to a full living vernacular, making it the only language in history to have been revived from near-extinction to become a community's first language.

Critics argue that resources devoted to languages with very few speakers might be better spent improving education in dominant languages, since economic integration ultimately determines long-term language viability.`,
		bt, sortBase, []cq{
			{"ynng", "Approximately seven thousand languages are currently spoken in the world.", "Yes", "The passage states 'Approximately seven thousand languages are spoken'.", nil},
			{"ynng", "According to UNESCO, most of today's languages will survive into the twenty-second century.", "No", "The passage states UNESCO projects 'roughly half could be extinct by the end of the twenty-first century'.", nil},
			{"ynng", "Hebrew is the only language ever revived from near-extinction to become a community's first language.", "Yes", "The passage states it is 'the only language in history to have been revived from near-extinction'.", nil},
			{"ynng", "A language is classified as endangered when it has fewer than one thousand speakers.", "Yes", "The passage explicitly states this threshold.", nil},
			{"ynng", "Critics of revitalisation believe language documentation is the most effective conservation approach.", "No", "Critics argue resources would be better spent 'improving education in dominant languages'.", nil},
			{"mc", "How often does a language disappear, according to the passage?", "B) Every two weeks", "The passage states 'a language disappears every two weeks'.", []string{"A) Every day", "B) Every two weeks", "C) Every month", "D) Every year"}},
			{"mc", "What is the primary driver of language shift?", "C) Economic need to use dominant languages for employment and education", "The passage states 'The primary driver of language shift is economic'.", []string{"A) Government policies that actively suppress minority languages", "B) Migration of speaker communities away from ancestral homelands", "C) Economic need to use dominant languages for employment and education", "D) Natural disasters that destroy communities using those languages"}},
			{"mc", "What does language documentation involve?", "A) Systematically recording grammar, vocabulary, and oral literature before last speakers die", "The passage defines it as 'systematic recording of grammar, vocabulary, and oral literature'.", []string{"A) Systematically recording grammar, vocabulary, and oral literature before last speakers die", "B) Teaching minority languages in national school curricula", "C) Publishing bilingual dictionaries for heritage language learners", "D) Training government officials to use endangered languages in administration"}},
			{"mc", "What legislation contributed to the growth of Welsh?", "D) The Welsh Language Act of 1993", "The passage states 'after the Welsh Language Act of 1993'.", []string{"A) The Welsh Education Reform Act of 1945", "B) The Cultural Heritage Act of 1976", "C) The Language Preservation Treaty of 1985", "D) The Welsh Language Act of 1993"}},
			{"mc", "What are kura kaupapa?", "B) Māori immersion schools in New Zealand", "The passage defines them as 'immersion schools called kura kaupapa'.", []string{"A) Government-funded Māori recording studios", "B) Māori immersion schools in New Zealand", "C) Annual indigenous language festivals", "D) University linguistics departments"}},
			{"sc", "Linguists estimate a language disappears every ______ weeks.", "two", "The passage states 'every two weeks'.", nil},
			{"sc", "A language is classified as endangered when fewer than ______ speakers use it as their primary language.", "one thousand", "The passage states this threshold.", nil},
			{"sc", "Hebrew is unique as the only language revived from near-extinction to become a community's ______ language.", "first", "The passage states 'first language'.", nil},
			{"sc", "The Welsh Language Act was passed in ______.", "1993", "The passage states 'the Welsh Language Act of 1993'.", nil},
		},
	)...)

	return all
}

// ─────────────────────────────────────────────────────────────────────────────
// Cambridge 16  —  sortBase 17 000
// ─────────────────────────────────────────────────────────────────────────────

func buildC16Reading() []models.IELTSQuestion {
	const (
		examSet  = "cambridge-16-test-1"
		sortBase = 17000
	)
	bt := stringPtr("7.0")
	var all []models.IELTSQuestion

	// ── P1: Citizen Science (easy) 5TFN+4SC+4SUMM ────────────────────────────
	all = append(all, expandReading(examSet, "Citizen Science", "Science & Society", "easy", 1,
		`Citizen science refers to non-professional volunteers participating in scientific data collection, analysis, or research. The term gained currency in the 1990s through the work of ecologist Rick Bonney, who used it to describe public involvement in bird surveys. Since then, the practice has expanded into astronomy, ecology, and public health.

Galaxy Zoo, launched in 2007, needed human eyes to classify galaxy shapes from telescope images. Automated algorithms struggled with the task. Within days the project had recruited more than one hundred and fifty thousand volunteers, who collectively produced more galaxy classifications in twenty-four hours than a professional team would have completed in years.

eBird, managed by the Cornell Lab of Ornithology, is the world's largest biodiversity citizen science project. Members submit bird observation records through a smartphone app; by 2023 the database held over one billion records from millions of observers. Researchers use the data to track population trends, model species distributions, and assess climate change impacts on migration.

Data accuracy is a persistent concern. Projects address this through training modules, calibration exercises, and cross-checking by multiple observers. Studies comparing citizen science with professional survey data generally find high agreement when quality controls are applied.

During the COVID-19 pandemic, citizen scientists reported symptoms through dedicated apps, helping health agencies map disease spread at a detail level that traditional surveillance could not achieve.`,
		bt, sortBase, []cq{
			{"tfn", "Rick Bonney used the term 'citizen science' in connection with bird surveys in the 1990s.", "True", "The passage states Bonney used it 'to describe public involvement in bird surveys' in the 1990s.", nil},
			{"tfn", "Galaxy Zoo was launched in 2007 to classify galaxy shapes.", "True", "The passage states 'launched in 2007' to 'classify galaxy shapes'.", nil},
			{"tfn", "Galaxy Zoo is managed by the Cornell Lab of Ornithology.", "False", "eBird is managed by the Cornell Lab; Galaxy Zoo was launched by astronomers.", nil},
			{"tfn", "Citizen science data quality concerns are solved only by excluding untrained volunteers.", "False", "The passage says concerns are addressed through 'training modules, calibration exercises, and cross-checking'.", nil},
			{"tfn", "During COVID-19, citizen scientists helped map disease spread through dedicated apps.", "True", "The passage states this explicitly.", nil},
			{"sc", "Galaxy Zoo was launched in ______.", "2007", "The passage states 'launched in 2007'.", nil},
			{"sc", "Galaxy Zoo recruited more than ______ thousand volunteers within days.", "one hundred and fifty", "The passage states 'more than one hundred and fifty thousand'.", nil},
			{"sc", "eBird is managed by the Cornell Lab of ______.", "Ornithology", "The passage states 'Cornell Lab of Ornithology'.", nil},
			{"sc", "Citizen science data quality is improved through training modules, calibration exercises, and ______ by multiple observers.", "cross-checking", "The passage states 'cross-checking by multiple observers'.", nil},
			{"summ", "Galaxy Zoo showed that ______ volunteers could classify more data in a day than a professional team working alone for years.", "human / non-professional", "The passage describes volunteers producing more classifications 'in twenty-four hours than a professional team would have completed in years'.", nil},
			{"summ", "eBird uses public observations to track population trends and assess the impact of ______ on bird migration.", "climate change", "The passage states 'assess climate change impacts on migration'.", nil},
			{"summ", "Studies show citizen science data achieves high accuracy when appropriate ______ controls are in place.", "quality", "The passage states 'when quality controls are applied'.", nil},
			{"summ", "During COVID-19, citizen scientists provided symptom data that allowed health agencies to map disease ______ in greater detail than traditional systems allowed.", "spread", "The passage states 'map disease spread at a detail level that traditional surveillance could not achieve'.", nil},
		},
	)...)

	// ── P2: History of Glass (medium) 4MH+5MC+4SA ────────────────────────────
	h2c16 := []string{
		"A) Glass in the ancient and prehistoric world",
		"B) Roman glassblowing and its transformative impact",
		"C) Venetian glassmakers and the secrecy of Murano",
		"D) Industrial breakthroughs in modern glass manufacturing",
	}
	all = append(all, expandReading(examSet, "The History of Glass", "Science & History", "medium", 2,
		`Glass has been used by humans for far longer than most realise. Naturally occurring volcanic glass called obsidian was fashioned into cutting tools by prehistoric peoples. The first deliberately manufactured glass appeared in Egypt and Mesopotamia around 3500 BCE, initially as glazes on stone beads.

Glassblowing was discovered in the Roman world around the first century BCE. Craftsmen introduced a hollow metal tube and blew air through it into molten glass, creating thin, varied vessels far more quickly than by casting. This made glass affordable and widespread throughout the Roman Empire.

In the medieval period Venice became Europe's glass centre. In 1291 the Venetian authorities moved all glassmakers to the island of Murano, fearing the furnaces would cause a catastrophic city fire. Isolated there, glassmakers developed extraordinary techniques including cristallo—exceptionally clear, colourless glass—and filigrana, in which coloured glass threads were twisted into complex patterns. Sharing trade secrets was punishable by severe penalties.

Two later innovations transformed the glass industry. Otto Schott developed borosilicate glass in 1887, a material with low thermal expansion suited to laboratory equipment and cookware. In 1952, Alastair Pilkington invented the float glass process, in which molten glass is poured onto a bed of molten tin to create a perfectly flat, uniform sheet. This process remains dominant today.`,
		bt, sortBase, []cq{
			{"mh", "Choose the heading for the paragraph beginning 'Glass has been used by humans for far longer…'", "A) Glass in the ancient and prehistoric world", "The paragraph covers obsidian and early manufactured glass.", h2c16},
			{"mh", "Choose the heading for the paragraph beginning 'Glassblowing was discovered in the Roman world…'", "B) Roman glassblowing and its transformative impact", "The paragraph describes the Roman invention of glassblowing.", h2c16},
			{"mh", "Choose the heading for the paragraph beginning 'In the medieval period Venice became Europe's glass centre.'", "C) Venetian glassmakers and the secrecy of Murano", "The paragraph discusses Venetian glassmakers on Murano.", h2c16},
			{"mh", "Choose the heading for the paragraph beginning 'Two later innovations transformed the glass industry.'", "D) Industrial breakthroughs in modern glass manufacturing", "The paragraph covers borosilicate glass and float glass.", h2c16},
			{"mc", "When was manufactured glass first produced?", "C) Around 3500 BCE", "The passage states 'around 3500 BCE'.", []string{"A) Around 10000 BCE", "B) Around 5000 BCE", "C) Around 3500 BCE", "D) Around 500 BCE"}},
			{"mc", "Why were Venetian glassmakers moved to Murano?", "B) To prevent their furnaces causing a catastrophic fire in the city", "The passage states 'fearing the furnaces would cause a catastrophic city fire'.", []string{"A) To isolate their secrets from foreign spies visiting Venice", "B) To prevent their furnaces causing a catastrophic fire in the city", "C) Because Murano sand was superior for glassmaking", "D) To satisfy a new law restricting industry inside city walls"}},
			{"mc", "What is cristallo?", "A) An exceptionally clear, colourless glass developed by Murano craftsmen", "The passage defines it as 'exceptionally clear, colourless glass'.", []string{"A) An exceptionally clear, colourless glass developed by Murano craftsmen", "B) A glass with coloured threads twisted into complex patterns", "C) A volcanic glass used as a prehistoric cutting tool", "D) A borosilicate glass invented in the nineteenth century"}},
			{"mc", "What makes borosilicate glass useful for laboratory equipment?", "D) Its low thermal expansion", "The passage states it has 'low thermal expansion'.", []string{"A) Its exceptional optical clarity", "B) Its ability to be shaped without heating", "C) Its resistance to corrosion by acids and alkalis", "D) Its low thermal expansion"}},
			{"mc", "What is the float glass process?", "B) Pouring molten glass onto molten tin to produce a flat, uniform sheet", "The passage states this exactly.", []string{"A) Blowing glass into flat moulds to produce architectural panels", "B) Pouring molten glass onto molten tin to produce a flat, uniform sheet", "C) Rolling glass between steel rollers at high temperature", "D) Cooling glass rapidly in water to prevent crystallisation"}},
			{"sa", "What naturally occurring glass was fashioned into prehistoric cutting tools?", "obsidian", "The passage states 'volcanic glass called obsidian'.", nil},
			{"sa", "In what year did Venice move its glassmakers to Murano?", "1291", "The passage states 'In 1291'.", nil},
			{"sa", "Who invented borosilicate glass, and in what year?", "Otto Schott, 1887", "The passage states 'Otto Schott developed borosilicate glass in 1887'.", nil},
			{"sa", "Who invented the float glass process?", "Alastair Pilkington", "The passage states 'Alastair Pilkington invented the float glass process'.", nil},
		},
	)...)

	// ── P3: Nudge Theory (hard) 5YNNG+5MC+4SC ────────────────────────────────
	all = append(all, expandReading(examSet, "Nudge Theory", "Behavioural Economics", "hard", 3,
		`Nudge theory is an approach to policy and choice architecture that guides individuals toward beneficial decisions without restricting their freedom. The framework was systematised by economist Richard Thaler and legal scholar Cass Sunstein in their 2008 book, drawing on behavioural economics insights that small environmental changes can produce large shifts in behaviour.

The key principle is what Thaler and Sunstein call "libertarian paternalism": institutions may legitimately influence behaviour in ways that serve people's long-term interests while preserving their right to opt out. Pension auto-enrollment exemplifies this: rather than requiring active sign-up, employees are enrolled by default and must take deliberate action to withdraw. Studies across many countries show this default dramatically increases participation compared to opt-in systems, without compelling anyone.

Research on cafeteria food placement shows that moving fresh fruit to eye level and to the front of a display increases fruit selection by approximately twenty-five percent in some studies, without removing any less healthy options. These findings have been applied in hospitals, schools, and workplace canteens.

Organ donation provides another example. Countries with presumed-consent opt-out systems—where people are assumed to consent unless they actively object—consistently show higher donor registration rates than opt-in countries, even when cultural attitudes toward donation are similar.

Critics raise ethical objections: by shaping the choice environment without explicit awareness, nudges may undermine rational autonomy. Others question whether nudges produce lasting change or merely shift decisions in the immediate context. Proponents respond that more coercive policies carry greater ethical risks.`,
		bt, sortBase, []cq{
			{"ynng", "Nudge theory was systematised by Thaler and Sunstein in their 2008 book.", "Yes", "The passage states 'systematised by economist Richard Thaler and legal scholar Cass Sunstein in their 2008 book'.", nil},
			{"ynng", "'Libertarian paternalism' means that institutions remove individuals' freedom to make their own choices.", "No", "The passage states it involves 'preserving their right to opt out'.", nil},
			{"ynng", "Opt-out organ donation systems consistently show higher donor registration than opt-in systems.", "Yes", "The passage states this 'consistently show higher donor registration rates'.", nil},
			{"ynng", "Research showed that placing fruit at eye level increased fruit selection by approximately twenty-five percent.", "Yes", "The passage states 'increases fruit selection by approximately twenty-five percent in some studies'.", nil},
			{"ynng", "All critics of nudge theory accept that it produces lasting behaviour change.", "No", "The passage states critics 'question whether nudges produce lasting change'.", nil},
			{"mc", "What is 'libertarian paternalism'?", "C) Guiding behaviour toward better outcomes while preserving freedom to opt out", "The passage defines it as influencing behaviour 'while preserving their right to opt out'.", []string{"A) Requiring people to make legally mandated healthy choices", "B) Removing unhealthy options from all public environments", "C) Guiding behaviour toward better outcomes while preserving freedom to opt out", "D) Using financial penalties to discourage harmful behaviour"}},
			{"mc", "How does pension auto-enrollment function as a nudge?", "B) Employees are enrolled by default and must actively opt out to withdraw", "The passage states 'employees are enrolled by default and must take deliberate action to withdraw'.", []string{"A) Employees are required by law to contribute a set percentage of salary", "B) Employees are enrolled by default and must actively opt out to withdraw", "C) Employers match contributions to encourage voluntary enrolment", "D) Pension information is displayed prominently in the workplace"}},
			{"mc", "What effect did placing fruit at eye level in cafeterias have?", "A) It increased fruit selection by approximately twenty-five percent", "The passage states 'increases fruit selection by approximately twenty-five percent'.", []string{"A) It increased fruit selection by approximately twenty-five percent", "B) It doubled fruit consumption across all settings studied", "C) It had no measurable effect on food choices", "D) It reduced overall calorie intake by ten percent"}},
			{"mc", "What ethical concern do critics raise about nudge theory?", "D) Nudges may undermine rational autonomy by manipulating the choice environment without awareness", "The passage states critics say 'nudges may undermine rational autonomy'.", []string{"A) Nudges create unfair advantages for wealthy consumers", "B) Only governments should be permitted to use nudging techniques", "C) Nudges inevitably lead to the complete removal of individual choice", "D) Nudges may undermine rational autonomy by manipulating the choice environment without awareness"}},
			{"mc", "How do proponents of nudge theory respond to ethical critics?", "B) They argue that more coercive policies carry greater ethical risks", "The passage states 'more coercive policies carry greater ethical risks'.", []string{"A) They claim nudges always produce permanent behaviour change", "B) They argue that more coercive policies carry greater ethical risks", "C) They acknowledge the criticism but maintain nudges are cost-free", "D) They propose mandatory public disclosure of all nudging programmes"}},
			{"sc", "Nudge theory was popularised in a 2008 book by Thaler and ______.", "Sunstein", "The passage names 'Cass Sunstein'.", nil},
			{"sc", "The principle of ______ paternalism guides decisions while preserving freedom of choice.", "libertarian", "The passage refers to 'libertarian paternalism'.", nil},
			{"sc", "Countries operating an ______-consent organ donation system show higher donor registration rates.", "opt-out / presumed", "The passage discusses 'presumed-consent opt-out systems'.", nil},
			{"sc", "Critics question whether nudges produce ______ behaviour change or only shift immediate decisions.", "lasting", "The passage states critics 'question whether nudges produce lasting change'.", nil},
		},
	)...)

	return all
}
