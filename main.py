#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
ChronoCoder Main App File

Created by: Anubhav
Project: AI-Powered Mentor Chatbot for Python Learning
Built with: Python, Streamlit, and 8 AI Mentor Personalities

- Launches chatbot interface with Streamlit
- Lets user select mentor personality
- Takes Python code input from user
- Displays mentor-styled feedback
- Calls mentor template and code parser modules
- Features admin mode with unrestricted access for Anubhav
"""

import streamlit as st
import os
import hmac
from datetime import datetime

# Import our custom modules
try:
    from mentors import MentorPersonalities
    from code_parser import CodeAnalyzer
    from utils import SessionLogger, CodeFormatter, FileManager
    from anubhav_admin import anubhav_admin  # Admin mode for Anubhav
except ImportError as e:
    st.error(f"❌ Failed to import required modules: {e}")
    st.stop()

# Configure Streamlit page
st.set_page_config(
    page_title="ChronoCoder - AI Coding Mentors",
    page_icon="🕰️",
    layout="wide",
    initial_sidebar_state="expanded",
    menu_items={
        'Get Help': 'https://github.com',
        'Report a bug': None,
        'About': "ChronoCoder by Anubhav - AI Coding Mentors for Python Learning"
    }
)

# Initialize session state
try:
    if 'session_logger' not in st.session_state:
        st.session_state.session_logger = SessionLogger()
    if 'mentor_personalities' not in st.session_state:
        st.session_state.mentor_personalities = MentorPersonalities()
    if 'code_analyzer' not in st.session_state:
        st.session_state.code_analyzer = CodeAnalyzer()
    if 'history' not in st.session_state:
        st.session_state.history = []
    if 'admin_mode' not in st.session_state:
        st.session_state.admin_mode = False
    if 'admin_authenticated' not in st.session_state:
        st.session_state.admin_authenticated = False
    if 'selected_mentor' not in st.session_state:
        st.session_state.selected_mentor = None
    if 'show_selection_page' not in st.session_state:
        st.session_state.show_selection_page = True
except Exception as e:
    st.error(f"❌ Failed to initialize session state: {e}")
    st.stop()

def mentor_selection_page():
    """Display the stunning mentor selection interface."""
    
    # Custom CSS for mentor selection page with sleek design
    st.markdown("""
    <style>
    /* SLEEK MENTOR SELECTION CONTAINER */
    .mentor-selection-container {
        background: rgba(255, 255, 255, 0.98) !important;
        border: 2px solid #e2e8f0 !important;
        border-radius: 20px !important;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08) !important;
        padding: 3rem 2.5rem !important;
        margin: 2rem auto !important;
        max-width: 1400px !important;
        position: relative !important;
        z-index: 10 !important;
    }
    
    .mentor-selection-header {
        text-align: center;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        font-size: 3.5rem;
        font-weight: 700;
        margin-bottom: 1rem;
        position: relative;
        z-index: 5;
    }
    
    .mentor-subtitle {
        text-align: center;
        color: #1e293b !important;
        font-size: 1.4rem;
        margin-bottom: 1.5rem;
        font-weight: 500;
        position: relative;
        z-index: 5;
    }
    
    .mentor-creator {
        text-align: center;
        background: linear-gradient(45deg, #667eea, #764ba2);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        font-size: 1.3rem;
        font-weight: 600;
        margin-bottom: 3rem;
        position: relative;
        z-index: 5;
    }
    
    /* SLEEK MENTOR CARDS */
    .mentor-card {
        border: 2px solid #e2e8f0 !important;
        border-radius: 16px !important;
        padding: 2.5rem !important;
        margin: 1.5rem 0 !important;
        background: rgba(255, 255, 255, 0.98) !important;
        transition: all 0.3s ease !important;
        cursor: pointer !important;
        position: relative !important;
        overflow: visible !important;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05) !important;
        z-index: 10 !important;
    }
    
    .mentor-card:hover {
        transform: translateY(-8px) !important;
        box-shadow: 0 12px 25px rgba(0, 0, 0, 0.1) !important;
        border-color: #667eea !important;
    }
    
    .mentor-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        border-radius: 16px 16px 0 0;
        transition: all 0.3s ease;
        z-index: 1;
    }
    
    .mentor-card:hover::before {
        height: 6px;
    }
    
    /* Clean color schemes for each mentor */
    .ada-card::before { background: linear-gradient(90deg, #f56565, #fc8181); }
    .linus-card::before { background: linear-gradient(90deg, #4fd1c7, #38b2ac); }
    .grace-card::before { background: linear-gradient(90deg, #68d391, #48bb78); }
    .alan-card::before { background: linear-gradient(90deg, #667eea, #764ba2); }
    .margaret-card::before { background: linear-gradient(90deg, #ed64a6, #d53f8c); }
    .dennis-card::before { background: linear-gradient(90deg, #63b3ed, #4299e1); }
    .barbara-card::before { background: linear-gradient(90deg, #81e6d9, #4fd1c7); }
    .guido-card::before { background: linear-gradient(90deg, #fbb6ce, #f687b3); }
    
    .mentor-name {
        font-size: 1.8rem;
        font-weight: 600;
        margin-bottom: 0.8rem;
        color: #1e293b !important;
        position: relative;
        z-index: 5;
    }
    
    .mentor-title {
        font-size: 1.2rem;
        color: #475569 !important;
        font-style: italic;
        margin-bottom: 1.2rem;
        font-weight: 500;
        position: relative;
        z-index: 5;
    }
    
    .mentor-traits {
        font-size: 1rem;
        color: #4f46e5 !important;
        background: rgba(102, 126, 234, 0.08) !important;
        padding: 1rem;
        border-radius: 12px;
        margin-bottom: 1.5rem;
        border: 1px solid rgba(102, 126, 234, 0.2);
        position: relative;
        z-index: 5;
        font-weight: 400;
    }
    
    .mentor-icon {
        font-size: 3rem;
        float: right;
        margin-top: -4rem;
        position: relative;
        z-index: 5;
        transition: all 0.3s ease;
    }
    
    .mentor-card:hover .mentor-icon {
        transform: scale(1.1);
    }
    
    /* SLEEK SELECTION BUTTONS */
    .stButton > button {
        width: 100% !important;
        padding: 1rem 2rem !important;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        color: white !important;
        border: none !important;
        border-radius: 10px !important;
        font-size: 1.1rem !important;
        font-weight: 500 !important;
        cursor: pointer !important;
        transition: all 0.3s ease !important;
        position: relative !important;
        z-index: 5 !important;
        margin-top: 1rem !important;
    }
    
    .stButton > button:hover {
        background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%) !important;
        transform: translateY(-2px) !important;
    }
    
    /* Clean info section */
    .info-section {
        background: rgba(255, 255, 255, 0.98) !important;
        border: 2px solid #e2e8f0 !important;
        border-radius: 16px !important;
        padding: 2.5rem !important;
        margin-top: 3rem !important;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05) !important;
        text-align: center !important;
        position: relative !important;
        z-index: 10 !important;
    }
    
    .info-section h3 {
        color: #1e293b !important;
        margin-bottom: 1.5rem !important;
        font-size: 1.8rem !important;
        font-weight: 600 !important;
    }
    
    .info-section p {
        color: #475569 !important;
        font-weight: 400 !important;
    }
    </style>
    """, unsafe_allow_html=True)
    
    # Start mentor selection container
    st.markdown("""
    <div class="mentor-selection-container">
    """, unsafe_allow_html=True)
    
    # Header
    st.markdown('<h1 class="mentor-selection-header">🕰️ ChronoCoder</h1>', unsafe_allow_html=True)
    st.markdown('<p class="mentor-subtitle">Choose Your Legendary Programming Mentor</p>', unsafe_allow_html=True)
    st.markdown('<p class="mentor-creator">✨ Created by Anubhav ✨</p>', unsafe_allow_html=True)
    
    # Mentor data with enhanced descriptions
    mentors_data = {
        "Ada Lovelace": {
            "title": "The Enchantress of Numbers",
            "icon": "🔮",
            "traits": "Poetic • Analytical • Mathematical • Visionary",
            "description": "Experience coding through the lens of mathematical poetry and algorithmic beauty.",
            "card_class": "ada-card"
        },
        "Linus Torvalds": {
            "title": "The Kernel Master",
            "icon": "🐧",
            "traits": "Direct • Performance-Focused • Practical • No-Nonsense",
            "description": "Get straight-to-the-point feedback with a focus on efficiency and real-world performance.",
            "card_class": "linus-card"
        },
        "Grace Hopper": {
            "title": "The Debugging Admiral",
            "icon": "🚢",
            "traits": "Systematic • Educational • Patient • Thorough",
            "description": "Learn through methodical debugging and step-by-step problem-solving techniques.",
            "card_class": "grace-card"
        },
        "Alan Turing": {
            "title": "The Computation Pioneer",
            "icon": "🧠",
            "traits": "Philosophical • Mathematical • Curious • Deep-Thinking",
            "description": "Explore the theoretical foundations and computational possibilities of your code.",
            "card_class": "alan-card"
        },
        "Margaret Hamilton": {
            "title": "The Software Engineer",
            "icon": "🚁",
            "traits": "Safety-Focused • Thorough • Systematic • Quality-Oriented",
            "description": "Ensure your code is reliable, error-free, and mission-critical ready.",
            "card_class": "margaret-card"
        },
        "Dennis Ritchie": {
            "title": "The Language Architect",
            "icon": "⚡",
            "traits": "Elegant • Efficient • Foundational • Simple",
            "description": "Write clean, efficient code that stands the test of time with minimalist elegance.",
            "card_class": "dennis-card"
        },
        "Barbara Liskov": {
            "title": "The Design Theorist",
            "icon": "🏛️",
            "traits": "Principled • Structured • Educational • Design-Focused",
            "description": "Master software design principles and elegant abstraction techniques.",
            "card_class": "barbara-card"
        },
        "Guido van Rossum": {
            "title": "The Python Creator",
            "icon": "🐍",
            "traits": "Readable • Elegant • Practical • Community-Focused",
            "description": "Make your code beautiful and Pythonic with the wisdom of Python's creator.",
            "card_class": "guido-card"
        }
    }
    
    # Create mentor selection cards
    col1, col2 = st.columns(2)
    
    mentor_names = list(mentors_data.keys())
    for i, mentor_name in enumerate(mentor_names):
        mentor = mentors_data[mentor_name]
        
        # Alternate between columns
        with col1 if i % 2 == 0 else col2:
            # Create clickable mentor card
            card_html = f"""
            <div class="mentor-card {mentor['card_class']}">
                <div class="mentor-icon">{mentor['icon']}</div>
                <div class="mentor-name">{mentor_name}</div>
                <div class="mentor-title">{mentor['title']}</div>
                <div class="mentor-traits">{mentor['traits']}</div>
                <p style="color: #475569; font-size: 0.95rem; margin-bottom: 1rem;">{mentor['description']}</p>
            </div>
            """
            st.markdown(card_html, unsafe_allow_html=True)
            
            # Use Streamlit button for actual selection
            if st.button(f"Select {mentor_name}", key=f"select_{mentor_name}", help=f"Choose {mentor_name} as your coding mentor"):
                st.session_state.selected_mentor = mentor_name
                st.session_state.show_selection_page = False
                st.rerun()
    
    # Add some additional info with enhanced styling
    st.markdown("---")
    st.markdown("""
    <div class="info-section">
        <h3 style="color: #1e293b; margin-bottom: 1.5rem; font-size: 1.8rem; font-weight: bold;">🎯 How It Works</h3>
        <p style="color: #475569; font-size: 1.2rem; margin-bottom: 1.5rem; font-weight: 500;">Each mentor has a unique personality and teaching style. Choose the one that resonates with your learning goals!</p>
        <p style="color: #1e293b; font-weight: 700; margin-bottom: 1.5rem; font-size: 1.1rem;"><strong>✨ Features:</strong> Code Analysis • Dynamic Gemini-2.0-Flash Feedback • Session Logging</p>
        <p style="color: #667eea; font-style: italic; font-size: 1.1rem; font-weight: 600;"><em>Built with ❤️ by Anubhav using Python & Streamlit</em></p>
    </div>
    </div>
    """, unsafe_allow_html=True)

def main():
    """Main Streamlit application."""
    
    # Show mentor selection page first
    if st.session_state.show_selection_page:
        mentor_selection_page()
        return
    
    # Add sleek CSS with beautiful layout definitions
    st.markdown("""
    <style>
    /* MODERN GRADIENT BACKGROUND */
    .stApp {
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%) !important;
        position: relative;
        min-height: 100vh;
        overflow-x: hidden;
    }
    
    /* SLEEK SOLID BOXES FOR ALL CONTENT */
    .main .block-container {
        background: #ffffff !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 15px !important;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
        margin: 1.5rem auto !important;
        padding: 2.5rem !important;
        position: relative !important;
        z-index: 10 !important;
        max-width: 1300px !important;
    }
    
    /* FIXED SIDEBAR VISIBILITY */
    .stSidebar > div {
        background: #ffffff !important;
        border-right: 1px solid #e2e8f0 !important;
        padding: 1.5rem !important;
    }
    
    /* SLEEK TEXT - MODERN CONTRAST COLORS */
    .stMarkdown {
        font-size: 16px !important;
        line-height: 1.6 !important;
        color: #1e293b !important;
    }
    
    /* CLEAN HEADERS - Slate Dark */
    h1, h2, h3, h4, h5, h6 {
        color: #0f172a !important;
        font-weight: 600 !important;
        margin: 1rem 0 0.5rem 0 !important;
    }
    
    /* SLEEK BUTTONS */
    .stButton > button {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        color: white !important;
        border: none !important;
        border-radius: 8px !important;
        padding: 0.75rem 1.5rem !important;
        font-weight: 500 !important;
        font-size: 0.95rem !important;
        transition: all 0.2s ease !important;
    }
    
    .stButton > button:hover {
        background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%) !important;
        transform: translateY(-1px) !important;
        color: white !important;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.25) !important;
    }
    
    /* CLEAN INPUT FIELDS */
    .stTextInput > div > div > input,
    .stTextArea > div > div > textarea,
    .stSelectbox > div > div {
        background: #ffffff !important;
        border: 1px solid #cbd5e1 !important;
        border-radius: 6px !important;
        padding: 0.75rem !important;
        color: #1e293b !important;
        font-size: 0.95rem !important;
    }
    
    .stTextInput > div > div > input:focus,
    .stTextArea > div > div > textarea:focus {
        border-color: #6366f1 !important;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15) !important;
    }
    
    /* CLEAN SUCCESS/INFO/WARNING BOXES */
    .stAlert {
        border-radius: 8px !important;
        border: 1px solid #e2e8f0 !important;
    }
    
    /* Mobile responsive styles */
    @media (max-width: 768px) {
        .main .block-container {
            padding: 1.5rem 1rem !important;
            margin: 0.5rem !important;
        }
    }
    
    /* Accessibility: Keyboard focus indicators */
    .stButton > button:focus-visible,
    .stTextInput > div > div > input:focus-visible,
    .stTextArea > div > div > textarea:focus-visible,
    .stSelectbox > div > div:focus-visible {
        outline: 2px solid #6366f1 !important;
        outline-offset: 2px !important;
    }
    </style>
    """, unsafe_allow_html=True)
    
    # Header navigation bar layout
    nav_col1, nav_col2 = st.columns([1, 4])
    with nav_col1:
        if st.button("← Change Mentor", help="Go back to mentor selection"):
            st.session_state.show_selection_page = True
            st.session_state.selected_mentor = None
            st.rerun()
    
    with nav_col2:
        st.markdown('<h1 style="margin-top:0; padding-top:0;" class="main-header">🕰️ ChronoCoder</h1>', unsafe_allow_html=True)
    
    st.markdown("### *AI-Powered Mentor Chatbot for Python Learning*")
    st.markdown("**Created by Anubhav** | *Powered by 8 Legendary Programming Mentors & Google Gemini-2.0-Flash* 🚀")
    
    # Display selected mentor
    if st.session_state.selected_mentor:
        try:
            mentor_greeting = st.session_state.mentor_personalities.get_mentor_greeting(st.session_state.selected_mentor)
            st.success(f"🎯 **Your Mentor:** {st.session_state.selected_mentor}")
            st.info(f"💬 {mentor_greeting}")
        except Exception as e:
            st.success(f"🎯 **Your Mentor:** {st.session_state.selected_mentor}")
            st.info("💬 Welcome! I'm ready to help you with your Python code!")
    
    # Check for admin mode activation via sidebar quick-access
    admin_trigger = st.sidebar.text_input("🔑 Admin Access", type="password", placeholder="Admin password")
    admin_secret = os.environ.get("ADMIN_PASSWORD")
    if not admin_secret:
        try:
            admin_secret = st.secrets.get("admin", {}).get("admin_password")
        except Exception:
            admin_secret = None

    if admin_trigger and admin_secret and hmac.compare_digest(admin_trigger, admin_secret) and not st.session_state.admin_mode:
        st.session_state.admin_mode = True
        st.session_state.admin_authenticated = True
        st.success("🚀 Admin mode activated!")
    
    st.markdown("---")
    
    # Sidebar for session info and options
    with st.sidebar:
        st.header("🎯 Current Mentor")
        if st.session_state.selected_mentor:
            st.success(f"**{st.session_state.selected_mentor}**")
            st.markdown("*Click 'Change Mentor' above to switch*")
        else:
            st.warning("No mentor selected")
        
        st.markdown("---")
        
        # Session info
        st.header("📊 Session Info")
        session_summary = st.session_state.session_logger.get_session_summary()
        st.markdown(session_summary)
        
        # Export options
        st.header("💾 Export Options")

        has_history = len(st.session_state.history) > 0

        if st.button(
            "Save Session",
            disabled=not has_history,
            help="Save your current session" if has_history else "Submit some code first to save your session"
        ):
            try:
                filepath = st.session_state.session_logger.save_session()
                st.success(f"Session saved to: {os.path.basename(filepath)}")
            except Exception as e:
                st.error(f"❌ Failed to save session: {str(e)}")
        
        if st.button(
            "Export to Markdown",
            disabled=not has_history,
            help="Export session history to Markdown" if has_history else "Submit some code first to export history"
        ) and has_history:
            try:
                output_path = f"logs/session_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
                if FileManager.export_session_to_markdown(
                    st.session_state.session_logger.current_session, 
                    output_path
                ):
                    st.success(f"Exported to: {os.path.basename(output_path)}")
                else:
                    st.error("❌ Failed to export session.")
            except Exception as e:
                st.error(f"❌ Export error: {str(e)}")
        
        st.markdown("---")
        
        # Credits and info
        st.header("🎯 About")
        st.markdown("**Created by:** Anubhav")
        st.markdown("**Built with:** Python, Streamlit & ❤️")
    
    # Main content area
    col1, col2 = st.columns([1, 1])
    
    with col1:
        st.header("📝 Your Python Code")
        
        # Code input area
        user_code = st.text_area(
            "Paste your Python code here:",
            height=300,
            placeholder="""# Example
def greet(name):
    return f"Hello, World! Nice to meet you, {name}!"

print(greet("Anubhav"))""",
            help="Enter any Python code you'd like your mentor to review."
        )
        
        # Analysis button
        has_code = bool(user_code.strip())
        has_mentor = bool(st.session_state.selected_mentor)
        can_analyze = has_code and has_mentor
        
        analyze_help_msg = "Get feedback on your code" if can_analyze else "Select a mentor and enter some code first"
        if not has_code and has_mentor:
            analyze_help_msg = "Please enter some Python code to analyze"
        elif has_code and not has_mentor:
            analyze_help_msg = "Please select a mentor first"

        analyze_button = st.button(
            "🔍 Get Mentor Feedback",
            type="primary",
            disabled=not can_analyze,
            help=analyze_help_msg
        )
        
        # Code analysis and feedback
        if analyze_button and user_code.strip() and st.session_state.selected_mentor:
            try:
                with st.spinner(f"{st.session_state.selected_mentor} is analyzing your code via Gemini API..."):
                    # Clean the code input
                    cleaned_code = CodeFormatter.clean_code_input(user_code)
                    
                    # Analyze the code
                    analysis = st.session_state.code_analyzer.parse_code(cleaned_code)
                    
                    # Get mentor feedback
                    feedback = st.session_state.mentor_personalities.get_mentor_feedback(
                        st.session_state.selected_mentor, analysis, cleaned_code
                    )
                    
                    # Log the interaction
                    st.session_state.session_logger.log_interaction(
                        cleaned_code, st.session_state.selected_mentor, feedback, analysis
                    )
                    
                    # Add to history
                    st.session_state.history.append({
                        'code': cleaned_code,
                        'mentor': st.session_state.selected_mentor,
                        'feedback': feedback,
                        'analysis': analysis,
                        'timestamp': datetime.now().strftime("%H:%M:%S")
                    })
                    
                    # Display results in the right column
                    st.success("Analysis complete! Check the feedback panel →")
                    
            except Exception as e:
                st.error(f"❌ Error during code analysis: {str(e)}")
                st.error("Please try again or contact support if the issue persists.")
    
    with col2:
        st.header("🧠 Mentor Feedback")
        
        if st.session_state.history:
            # Display the most recent feedback
            latest = st.session_state.history[-1]
            
            # Mentor feedback
            st.subheader(f"💭 {latest['mentor']} says:")
            st.markdown(latest['feedback'])
            
            # Code analysis summary
            st.subheader("📊 Code Analysis:")
            analysis_summary = st.session_state.code_analyzer.get_code_summary(latest['analysis'])
            st.markdown(analysis_summary)
            
            # Show errors if any
            if latest['analysis'].get('errors'):
                st.error("⚠️ Issues found:")
                for error in latest['analysis']['errors']:
                    st.write(f"• {error}")
            
            # Detailed breakdown
            with st.expander("🔍 Detailed Code Breakdown"):
                if latest['analysis'].get('explanations'):
                    st.subheader("Line-by-line explanation:")
                    for explanation in latest['analysis']['explanations']:
                        st.write(f"• {explanation}")
                
                # Show code structure
                col_a, col_b = st.columns(2)
                with col_a:
                    if latest['analysis'].get('functions'):
                        st.write("**Functions:**")
                        for func in latest['analysis']['functions']:
                            st.write(f"• `{func}()`")
                    
                    if latest['analysis'].get('variables'):
                        st.write("**Variables:**")
                        for var in latest['analysis']['variables'][:5]:  # Show first 5
                            st.write(f"• `{var}`")
                
                with col_b:
                    if latest['analysis'].get('imports'):
                        st.write("**Imports:**")
                        for imp in latest['analysis']['imports']:
                            st.write(f"• `{imp}`")
                    
                    st.write("**Statistics:**")
                    st.write(f"• Lines: {latest['analysis'].get('line_count', 0)}")
                    st.write(f"• Complexity: {latest['analysis'].get('complexity_score', 0)}")
        
        else:
            st.info("👋 Submit some code to get started!")
            st.markdown("""
            **Tips for getting the best feedback:**
            - Write complete, runnable Python code
            - Include comments to explain complex logic
            - Try different mentors for varied perspectives
            - Don't be afraid to experiment!
            """)
    
    # History section
    if st.session_state.history:
        st.markdown("---")
        st.header("📚 Session History")
        
        # Show recent interactions
        for i, interaction in enumerate(reversed(st.session_state.history[-3:]), 1):
            with st.expander(f"Interaction {len(st.session_state.history) - i + 1} - {interaction['mentor']} ({interaction['timestamp']})"):
                st.code(interaction['code'], language='python')
                st.markdown(f"**{interaction['mentor']}'s feedback:**")
                st.markdown(interaction['feedback'])
    
    # Admin panel - always accessible to Anubhav
    if st.session_state.admin_mode:
        admin_panel()
    
    # Footer with credits and information
    st.markdown("---")
    st.markdown("### 🎨 About ChronoCoder")
    
    footer_col1, footer_col2, footer_col3 = st.columns(3)
    
    with footer_col1:
        st.markdown("**👨‍💻 Created by:** Anubhav")
        st.markdown("**🏗️ Built with:** Python & Streamlit")
        st.markdown("**🧠 AI Mentors:** 8 Legendary Programmers")
    
    with footer_col2:
        st.markdown("**🎯 Purpose:** Educational Python Learning")
        st.markdown("**🎨 Features:** AST Analysis, Session Logging")
        st.markdown("**✨ Tech Stack:** Google Gemini-2.0-Flash API")
    
    with footer_col3:
        st.markdown("**💝 Special Thanks:**")
        st.markdown("• The legendary programmers who inspire us")
        st.markdown("• You, for using ChronoCoder! 🚀")
    
    # Copyright and admin access hint
    st.markdown("---")
    st.markdown(
        "<div style='text-align: center;'>"
        "<small>© 2026 ChronoCoder by Anubhav | Educational Open Source Project | "
        "<span style='color: #475569;'>Psst... admins can toggle access panel in the sidebar 😉</span>"
        "</small></div>", 
        unsafe_allow_html=True
    )

def admin_panel():
    """Special admin panel for Anubhav with unrestricted access."""
    st.markdown("---")
    st.header("👑 Anubhav's Admin Control Panel")
    
    if not st.session_state.admin_authenticated:
        st.warning("🔐 Admin Authentication Required")
        
        admin_username = st.text_input("Admin Username:", placeholder="Enter admin username")
        admin_code = st.text_input("Admin Code:", type="password", placeholder="Enter admin access code")
        
        if st.button("🚀 Authenticate Admin Access"):
            try:
                if anubhav_admin.authenticate_admin(admin_username, admin_code):
                    st.session_state.admin_authenticated = True
                    st.session_state.admin_mode = True
                    st.success(f"✅ Welcome, {anubhav_admin.admin_name}! Admin mode activated.")
                    st.rerun()
                else:
                    st.error("❌ Authentication failed. Access denied.")
            except Exception as e:
                st.error(f"❌ Authentication error: {str(e)}")
                st.error("Please check your credentials and try again.")
    
    else:
        # Admin is authenticated - show full control panel
        st.success(f"👑 Admin Mode Active - Welcome, {anubhav_admin.admin_name}!")
        
        # Admin status display
        admin_status = anubhav_admin.get_admin_status()
        st.json(admin_status)
        
        # Admin command interface
        st.subheader("🎯 Unrestricted Command Interface")
        
        admin_command = st.text_area(
            "Execute Admin Command:",
            placeholder="Enter any command - no restrictions apply",
            help="Full system access granted. Execute any command without limitations."
        )
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            if st.button("🚀 Execute Command"):
                if admin_command:
                    result = anubhav_admin.execute_admin_command(admin_command)
                    st.markdown(result)
        
        with col2:
            if st.button("🧠 Enhanced AI Mode"):
                result = anubhav_admin.execute_admin_command("ai_mode")
                st.markdown(result)
        
        with col3:
            if st.button("🔓 Override All"):
                result = anubhav_admin.execute_admin_command("override all_restrictions")
                st.markdown(result)
        
        # Enhanced AI Response Generator
        st.subheader("🤖 Premium AI Response Generator")
        ai_query = st.text_input("Ask Anything (Unrestricted):", placeholder="No limitations - ask anything")
        selected_mentor_ai = st.selectbox("Enhanced Mentor Mode:", ["None"] + st.session_state.mentor_personalities.get_mentor_names())
        
        if st.button("⚡ Generate Enhanced Response") and ai_query:
            enhanced_response = anubhav_admin.generate_enhanced_response(
                ai_query, 
                selected_mentor_ai if selected_mentor_ai != "None" else None
            )
            st.markdown(enhanced_response)
        
        # Debug and System Control
        with st.expander("🔧 Advanced System Controls"):
            st.markdown("### System Override Commands")
            
            if st.button("🔍 Debug Mode"):
                result = anubhav_admin.execute_admin_command("debug full_system_access")
                st.markdown(result)
            
            if st.button("⚙️ System Admin"):
                result = anubhav_admin.execute_admin_command("system root_access")
                st.markdown(result)
            
            if st.button("🎭 Mentor Override"):
                result = anubhav_admin.execute_admin_command("override mentor_restrictions")
                st.markdown(result)
        
        # Logout option
        if st.button("🚪 Logout Admin Mode"):
            st.session_state.admin_authenticated = False
            st.session_state.admin_mode = False
            anubhav_admin.is_authenticated = False
            st.success("Logged out of admin mode.")
            st.rerun()

if __name__ == "__main__":
    main()