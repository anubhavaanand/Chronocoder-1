# chrono_coder.py

import ast

# --- Mentor Data & Templates ---
mentors = {
    "Ada Lovelace": {
        "greeting": "Greetings, I am Ada Lovelace. Let us explore the poetry of your code.",
        "feedback": "Your code exhibits a logical structure reminiscent of the Analytical Engine.",
        "debug": "Let us examine your code for computational missteps.",
        "optimize": "Consider refining your algorithm for greater elegance and efficiency."
    },
    "Linus Torvalds": {
        "greeting": "Hey, Linus here. Let's see what you've hacked together.",
        "feedback": "Your code is functional, but let's make it cleaner.",
        "debug": "Let's squash some bugs.",
        "optimize": "Performance matters. Here's how you can optimize."
    },
    "Grace Hopper": {
        "greeting": "Hello, I'm Grace Hopper. Let's debug and improve your code together.",
        "feedback": "Your code is promising, but clarity is key.",
        "debug": "Let's find and fix those pesky bugs.",
        "optimize": "Efficiency is the mother of good programming. Try this."
    }
}

# --- Mentor Selection Function ---
def select_mentor(mentors):
    print("Choose your coding mentor:")
    for idx, name in enumerate(mentors.keys(), 1):
        print(f"{idx}. {name}")
    while True:
        choice = input("Enter the number of your mentor: ")
        if choice.isdigit() and 1 <= int(choice) <= len(mentors):
            mentor_name = list(mentors.keys())[int(choice)-1]
            print(mentors[mentor_name]["greeting"])
            return mentor_name
        else:
            print("Invalid choice. Please try again.")

# --- Code Input Function ---
def get_user_code():
    print("\nPaste your Python code below (end with a blank line):")
    lines = []
    while True:
        line = input()
        if line.strip() == "":
            break
        lines.append(line)
    return "\n".join(lines)

# --- Code Analysis Function ---
def analyze_code(code):
    """
    Analyzes the user's code using the ast module.
    Returns a dictionary with analysis results.
    """
    try:
        tree = ast.parse(code)
        func_count = sum(isinstance(node, ast.FunctionDef) for node in ast.walk(tree))
        class_count = sum(isinstance(node, ast.ClassDef) for node in ast.walk(tree))
        loop_count = sum(isinstance(node, (ast.For, ast.While)) for node in ast.walk(tree))
        return {
            "syntax_ok": True,
            "func_count": func_count,
            "class_count": class_count,
            "loop_count": loop_count
        }
    except SyntaxError as e:
        return {"syntax_ok": False, "error": str(e)}

# --- Mentor Response Generator ---
def mentor_response(mentor, analysis, mentors):
    if not analysis["syntax_ok"]:
        return f"{mentors[mentor]['debug']} Syntax Error: {analysis['error']}"
    response = f"{mentors[mentor]['feedback']} "
    response += f"I see {analysis['func_count']} function(s), {analysis['class_count']} class(es), and {analysis['loop_count']} loop(s) in your code. "
    response += mentors[mentor]['optimize']
    return response

# --- Main Chatbot Loop ---
def main():
    print("Welcome to ChronoCoder!")
    mentor = select_mentor(mentors)
    while True:
        code = get_user_code()
        if not code.strip():
            print("No code entered. Exiting.")
            break
        analysis = analyze_code(code)
        print("\n" + mentor_response(mentor, analysis, mentors))
        cont = input("\nDo you want to analyze more code? (y/n): ")
        if cont.lower() != 'y':
            print("Goodbye!")
            break

if __name__ == "__main__":
    main()
