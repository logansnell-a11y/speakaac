"""
Generate audio files for every symbol in the AAC app.
Uses Google TTS (gTTS) — sounds natural, completely free.
Run once. Files get saved to ~/aac-app/audio/
After running, the app will play these instead of robot voice.
"""

from gtts import gTTS
import os

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "audio")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Every speech phrase used in the app
# Format: filename (no spaces) -> spoken text
PHRASES = {
    # Needs
    "yes":              "Yes",
    "no":               "No",
    "eat":              "Eat",
    "drink":            "Drink",
    "bathroom":         "Bathroom",
    "i_am_hurting":     "I am hurting",
    "i_need_help":      "I need help",
    "all_done":         "All done",
    "water":            "Water",
    "sleep":            "Sleep",
    "rest":             "Rest",
    "i_feel_sick":      "I feel sick",
    "medicine":         "Medicine",
    "hot":              "Hot",
    "cold":             "Cold",
    "stop":             "Stop",
    "please":           "Please",
    "more":             "More",

    # Feelings
    "happy":            "Happy",
    "sad":              "Sad",
    "angry":            "Angry",
    "scared":           "Scared",
    "i_feel_hurt":      "I feel hurt",
    "tired":            "Tired",
    "excited":          "Excited",
    "confused":         "Confused",
    "frustrated":       "Frustrated",
    "calm":             "Calm",
    "lonely":           "Lonely",
    "overwhelmed":      "Overwhelmed",
    "loved":            "Loved",
    "bored":            "Bored",
    "nervous":          "Nervous",
    "proud":            "Proud",

    # People
    "mom":              "Mom",
    "dad":              "Dad",
    "i":                "I",
    "my_friend":        "My friend",
    "teacher":          "Teacher",
    "doctor":           "Doctor",
    "grandma":          "Grandma",
    "grandpa":          "Grandpa",
    "my_sibling":       "My sibling",
    "therapist":        "Therapist",

    # Places
    "home":             "Home",
    "school":           "School",
    "outside":          "Outside",
    "bedroom":          "Bedroom",
    "the_bathroom":     "The bathroom",
    "the_car":          "The car",
    "kitchen":          "Kitchen",
    "the_park":         "The park",
    "hospital":         "Hospital",
    "the_store":        "The store",

    # Actions
    "i_want":           "I want",
    "play":             "Play",
    "go":               "Go",
    "a_hug":            "A hug",
    "a_break":          "A break",
    "listen_to_music":  "Listen to music",
    "read":             "Read",
    "watch_tv":         "Watch TV",
    "talk":             "Talk",
    "walk":             "Walk",
    "quiet_time":       "Quiet time",
    "wait":             "Wait",

    # Food
    "apple":            "Apple",
    "banana":           "Banana",
    "sandwich":         "Sandwich",
    "milk":             "Milk",
    "a_snack":          "A snack",
    "juice":            "Juice",
    "pizza":            "Pizza",
    "chicken":          "Chicken",
    "rice":             "Rice",
    "soup":             "Soup",
    "cookie":           "Cookie",
    "ice_cream":        "Ice cream",

    # Social
    "hello":            "Hello",
    "thank_you":        "Thank you",
    "i_like":           "I like",
    "i_dont_like":      "I don't like",
    "im_sorry":         "I'm sorry",
    "good":             "Good",
    "again":            "Again",
    "goodbye":          "Goodbye",
    "bad":              "Bad",
    "i_have_a_question":"I have a question",
    "i_understand":     "I understand",
    "i_dont_understand":"I don't understand",

    # Sentence connector words
    "and":              "And",
    "with":             "With",
    "the":              "The",
}

print(f"Generating {len(PHRASES)} audio files...\n")

for filename, text in PHRASES.items():
    path = os.path.join(OUTPUT_DIR, f"{filename}.mp3")
    if os.path.exists(path):
        print(f"  [skip] {filename}.mp3 already exists")
        continue
    try:
        tts = gTTS(text=text, lang="en", tld="com", slow=False)
        tts.save(path)
        print(f"  [ok]   {filename}.mp3 — \"{text}\"")
    except Exception as e:
        print(f"  [err]  {filename}: {e}")

print(f"\nDone. Audio files saved to: {OUTPUT_DIR}")
print("Refresh the app — symbols will now use real voice instead of browser TTS.")
