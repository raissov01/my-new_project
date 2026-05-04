package main

import (
	"context"
	"encoding/json"
	"log"

	"github.com/midoriya/flashlearn-backend/internal/config"
	"github.com/midoriya/flashlearn-backend/internal/database"
	"github.com/midoriya/flashlearn-backend/internal/models"
)

type seedQuestion struct {
	TopicSlug    string
	Section      string
	Difficulty   string
	Prompt       string
	Options      []string
	Answer       string
	Explanation  string
	SourceSuffix string
}

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}
	db, err := database.ConnectGorm(cfg.DatabaseURL, cfg.Environment)
	if err != nil {
		log.Fatalf("db: %v", err)
	}

	ctx := context.Background()
	questions := starterQuestions()

	var topics []models.NUETTopic
	if err := db.WithContext(ctx).Find(&topics).Error; err != nil {
		log.Fatalf("load topics: %v", err)
	}
	topicBySlug := make(map[string]models.NUETTopic, len(topics))
	for _, topic := range topics {
		topicBySlug[topic.Slug] = topic
	}

	if err := db.WithContext(ctx).Where("source LIKE ?", "starter:%").Delete(&models.NUETQuestion{}).Error; err != nil {
		log.Fatalf("clear starter questions: %v", err)
	}

	created := 0
	for _, item := range questions {
		topic, ok := topicBySlug[item.TopicSlug]
		if !ok {
			log.Printf("[seed] skip missing topic %s", item.TopicSlug)
			continue
		}
		optionsJSON, _ := json.Marshal(item.Options)
		options := string(optionsJSON)
		topicID := topic.ID
		question := models.NUETQuestion{
			TopicID:      &topicID,
			Section:      item.Section,
			Difficulty:   item.Difficulty,
			Prompt:       item.Prompt,
			Options:      &options,
			Answer:       item.Answer,
			Explanation:  item.Explanation,
			Source:       "starter:" + item.SourceSuffix,
			QuestionType: "multiple_choice",
		}
		if err := db.WithContext(ctx).Create(&question).Error; err != nil {
			log.Printf("[seed] failed %s: %v", item.TopicSlug, err)
			continue
		}
		created++
	}

	log.Printf("[seed] inserted %d starter NUET questions", created)
}

func starterQuestions() []seedQuestion {
	return []seedQuestion{
		{
			TopicSlug:    "direct-and-inverse-proportion",
			Section:      "math",
			Difficulty:   "medium",
			Prompt:       "5 notebooks cost 350 tenge. If the price is directly proportional to the number of notebooks, how much do 8 notebooks cost?",
			Options:      []string{"480", "560", "600", "700"},
			Answer:       "B",
			Explanation:  "One notebook costs 350 / 5 = 70 tenge, so 8 cost 8 x 70 = 560.",
			SourceSuffix: "direct_inverse_1",
		},
		{
			TopicSlug:    "recurring-decimals",
			Section:      "math",
			Difficulty:   "medium",
			Prompt:       "Convert 0.333... into a fraction.",
			Options:      []string{"1/9", "1/6", "1/3", "3/10"},
			Answer:       "C",
			Explanation:  "0.333... is the standard recurring decimal for one third.",
			SourceSuffix: "recurring_1",
		},
		{
			TopicSlug:    "algebraic-simplification-with-x-variable",
			Section:      "math",
			Difficulty:   "medium",
			Prompt:       "Simplify 3x + 5x - 2.",
			Options:      []string{"8x - 2", "8x + 2", "15x - 2", "6x - 2"},
			Answer:       "A",
			Explanation:  "3x and 5x are like terms, so they combine to 8x.",
			SourceSuffix: "algebra_1",
		},
		{
			TopicSlug:    "circle-theorems-especially-with-chords",
			Section:      "math",
			Difficulty:   "medium",
			Prompt:       "An angle at the center of a circle is 100 degrees. What is the angle at the circumference standing on the same arc?",
			Options:      []string{"25 degrees", "40 degrees", "50 degrees", "100 degrees"},
			Answer:       "C",
			Explanation:  "The angle at the center is twice the angle at the circumference on the same arc.",
			SourceSuffix: "circle_1",
		},
		{
			TopicSlug:    "percentages-word-problem-decrease-increase",
			Section:      "math",
			Difficulty:   "medium",
			Prompt:       "A jacket costs 20,000 tenge and goes up by 15%. What is the new price?",
			Options:      []string{"21,500", "22,000", "23,000", "24,500"},
			Answer:       "C",
			Explanation:  "15% of 20,000 is 3,000. Add it to get 23,000.",
			SourceSuffix: "percentages_1",
		},
		{
			TopicSlug:    "rounding-to-significant-figures-standard-form",
			Section:      "math",
			Difficulty:   "medium",
			Prompt:       "Write 0.00056 in standard form.",
			Options:      []string{"5.6 x 10^4", "5.6 x 10^-4", "56 x 10^-5", "0.56 x 10^-3"},
			Answer:       "B",
			Explanation:  "Move the decimal four places to the right, so the power is -4.",
			SourceSuffix: "standard_form_1",
		},
		{
			TopicSlug:    "graph-transformation-usually-parabola",
			Section:      "math",
			Difficulty:   "medium",
			Prompt:       "How is the graph of y = x^2 transformed to get y = (x - 3)^2?",
			Options:      []string{"Shift left by 3", "Shift right by 3", "Shift up by 3", "Reflect in the x-axis"},
			Answer:       "B",
			Explanation:  "Replacing x with (x - 3) shifts the graph right by 3.",
			SourceSuffix: "graph_transform_1",
		},
		{
			TopicSlug:    "vertex-turning-point-of-parabola",
			Section:      "math",
			Difficulty:   "medium",
			Prompt:       "What is the turning point of y = (x + 2)^2 - 5?",
			Options:      []string{"(-2, -5)", "(2, -5)", "(-2, 5)", "(2, 5)"},
			Answer:       "A",
			Explanation:  "The vertex form y = (x - h)^2 + k has turning point (h, k).",
			SourceSuffix: "vertex_1",
		},
		{
			TopicSlug:    "vectors",
			Section:      "math",
			Difficulty:   "medium",
			Prompt:       "If a = (2, 3) and b = (1, -4), what is a + b?",
			Options:      []string{"(3, -1)", "(1, 7)", "(2, -1)", "(3, 7)"},
			Answer:       "A",
			Explanation:  "Add components separately: (2 + 1, 3 + -4) = (3, -1).",
			SourceSuffix: "vectors_1",
		},
		{
			TopicSlug:    "bearings",
			Section:      "math",
			Difficulty:   "medium",
			Prompt:       "A ship travels due east from point A. What is its bearing from A?",
			Options:      []string{"045 degrees", "090 degrees", "180 degrees", "270 degrees"},
			Answer:       "B",
			Explanation:  "Bearings are measured clockwise from north, so east is 090 degrees.",
			SourceSuffix: "bearings_1",
		},
		{
			TopicSlug:    "parallel-and-perpendicular-lines",
			Section:      "math",
			Difficulty:   "medium",
			Prompt:       "Line l has gradient 3. What gradient must a line perpendicular to l have?",
			Options:      []string{"3", "-3", "1/3", "-1/3"},
			Answer:       "D",
			Explanation:  "Perpendicular gradients are negative reciprocals.",
			SourceSuffix: "parallel_perpendicular_1",
		},
		{
			TopicSlug:    "coordinate-geometry",
			Section:      "math",
			Difficulty:   "medium",
			Prompt:       "What is the midpoint of the segment joining (2, 4) and (6, 10)?",
			Options:      []string{"(4, 7)", "(8, 14)", "(3, 5)", "(4, 6)"},
			Answer:       "A",
			Explanation:  "Use the midpoint formula ((x1 + x2)/2, (y1 + y2)/2).",
			SourceSuffix: "coordinate_1",
		},
		{
			TopicSlug:    "rhombus-kite-trapezium",
			Section:      "math",
			Difficulty:   "medium",
			Prompt:       "Which quadrilateral always has all four sides equal?",
			Options:      []string{"Kite", "Trapezium", "Rhombus", "Rectangle"},
			Answer:       "C",
			Explanation:  "A rhombus has four equal sides.",
			SourceSuffix: "quadrilaterals_1",
		},
		{
			TopicSlug:    "trigonometry-in-right-angled-triangle",
			Section:      "math",
			Difficulty:   "medium",
			Prompt:       "In a right triangle, sin(theta) = opposite / ?",
			Options:      []string{"adjacent", "hypotenuse", "base", "perimeter"},
			Answer:       "B",
			Explanation:  "SOH says sine is opposite over hypotenuse.",
			SourceSuffix: "trigonometry_1",
		},
		{
			TopicSlug:    "exponents-with-bases-2-3-and-5",
			Section:      "math",
			Difficulty:   "medium",
			Prompt:       "Simplify 2^3 x 2^4.",
			Options:      []string{"2^7", "2^12", "4^7", "2^1"},
			Answer:       "A",
			Explanation:  "When multiplying powers with the same base, add exponents.",
			SourceSuffix: "exponents_1",
		},
		{
			TopicSlug:    "real-life-graphs-velocity-time",
			Section:      "math",
			Difficulty:   "medium",
			Prompt:       "On a velocity-time graph, what does the area under the graph represent?",
			Options:      []string{"Speed", "Distance travelled", "Acceleration", "Time taken"},
			Answer:       "B",
			Explanation:  "The area under a velocity-time graph gives displacement or distance in basic cases.",
			SourceSuffix: "velocity_time_1",
		},
		{
			TopicSlug:    "compound-3d-figure-cylinder-sphere-cone",
			Section:      "math",
			Difficulty:   "medium",
			Prompt:       "What is the volume formula for a cylinder?",
			Options:      []string{"pi r^2 h", "2 pi r h", "4/3 pi r^3", "1/3 pi r^2 h"},
			Answer:       "A",
			Explanation:  "Cylinder volume is base area times height.",
			SourceSuffix: "compound_3d_1",
		},
		{
			TopicSlug:    "logical-reasoning",
			Section:      "critical_thinking",
			Difficulty:   "medium",
			Prompt:       "All NUET tutors are mentors. Some mentors are mathematicians. Which statement must be true?",
			Options:      []string{"All mathematicians are NUET tutors", "Some NUET tutors are mathematicians", "All NUET tutors are mentors", "No mentors are mathematicians"},
			Answer:       "C",
			Explanation:  "The first sentence directly guarantees that every NUET tutor is a mentor.",
			SourceSuffix: "logical_reasoning_1",
		},
		{
			TopicSlug:    "argument-analysis",
			Section:      "critical_thinking",
			Difficulty:   "medium",
			Prompt:       "A student says, 'I scored higher after drinking coffee, so coffee causes better scores.' What is the main weakness?",
			Options:      []string{"It assumes all students drink coffee", "It confuses correlation with causation", "It proves coffee is harmful", "It ignores the exam subject"},
			Answer:       "B",
			Explanation:  "One improvement after coffee does not prove coffee caused the improvement.",
			SourceSuffix: "argument_analysis_1",
		},
		{
			TopicSlug:    "problem-solving",
			Section:      "critical_thinking",
			Difficulty:   "medium",
			Prompt:       "A bus leaves every 12 minutes. If one leaves at 14:00, what time does the fifth bus leave?",
			Options:      []string{"14:36", "14:48", "15:00", "15:12"},
			Answer:       "B",
			Explanation:  "The fifth bus is four intervals later: 4 x 12 = 48 minutes.",
			SourceSuffix: "problem_solving_1",
		},
		{
			TopicSlug:    "data-interpretation",
			Section:      "critical_thinking",
			Difficulty:   "medium",
			Prompt:       "A school's math club had 40 students last year and 50 this year. What is the percentage increase?",
			Options:      []string{"10%", "20%", "25%", "40%"},
			Answer:       "C",
			Explanation:  "Increase is 10 on a base of 40, so 10 / 40 = 25%.",
			SourceSuffix: "data_interpretation_1",
		},
		{
			TopicSlug:    "pattern-recognition",
			Section:      "critical_thinking",
			Difficulty:   "medium",
			Prompt:       "What is the next number in the sequence 2, 6, 12, 20, 30, ...?",
			Options:      []string{"36", "40", "42", "44"},
			Answer:       "C",
			Explanation:  "The differences are +4, +6, +8, +10, so the next difference is +12.",
			SourceSuffix: "pattern_recognition_1",
		},
	}
}
