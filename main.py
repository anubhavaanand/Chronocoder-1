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
        color: #000000 !important;
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
        color: #000000 !important;
        position: relative;
        z-index: 5;
    }
    
    .mentor-title {
        font-size: 1.2rem;
        color: #000000 !important;
        font-style: italic;
        margin-bottom: 1.2rem;
        font-weight: 500;
        position: relative;
        z-index: 5;
    }
    
    .mentor-traits {
        font-size: 1rem;
        color: #000000 !important;
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
        color: #000000 !important;
        margin-bottom: 1.5rem !important;
        font-size: 1.8rem !important;
        font-weight: 600 !important;
    }
    
    .info-section p {
        color: #000000 !important;
        font-weight: 400 !important;
    }
    
    /* ANIMATION TEST INDICATOR */
    .animation-test {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 20px;
        height: 20px;
        background: #FFD43B;
        border-radius: 50%;
        z-index: 1000;
        animation: pulse 2s ease-in-out infinite;
        opacity: 0.7;
    }
    
    @keyframes pulse {
        0% { transform: scale(1); opacity: 0.7; }
        50% { transform: scale(1.5); opacity: 1; }
        100% { transform: scale(1); opacity: 0.7; }
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
                <p style="color: #000000; font-size: 0.9rem; margin-bottom: 1rem;">{mentor['description']}</p>
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
        <h3 style="color: #2c3e50; margin-bottom: 1.5rem; font-size: 1.8rem; font-weight: bold;">🎯 How It Works</h3>
        <p style="color: #34495e; font-size: 1.2rem; margin-bottom: 1.5rem; font-weight: 500;">Each mentor has a unique personality and teaching style. Choose the one that resonates with your learning goals!</p>
        <p style="color: #2c3e50; font-weight: 700; margin-bottom: 1.5rem; font-size: 1.1rem;"><strong>✨ Features:</strong> Code Analysis • Personalized Feedback • Easter Eggs • Session Logging</p>
        <p style="color: #667eea; font-style: italic; font-size: 1.1rem; font-weight: 600;"><em>Built with ❤️ by Anubhav using Python & Streamlit</em></p>
    </div>
    </div>
    """, unsafe_allow_html=True)

    # Add animation test indicator to mentor selection page
    st.markdown("""
    <div class="animation-test"></div>
    """, unsafe_allow_html=True)

def main():
    """Main Streamlit application."""
    
    # Show mentor selection page first
    if st.session_state.show_selection_page:
        mentor_selection_page()
        return
    
    # Add sleek CSS with enhanced roaming Python background
    st.markdown("""
    <style>
    /* MODERN GRADIENT BACKGROUND */
    .stApp {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%);
        background-size: 400% 400%;
        animation: gradientShift 15s ease-in-out infinite;
        position: relative;
        min-height: 100vh;
        overflow-x: hidden;
    }
    
    @keyframes gradientShift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }
    
    /* ENHANCED ROAMING PYTHON SNAKE */
    .python-snake {
        position: fixed;
        top: 0;
        left: 0;
        width: 120px;
        height: 120px;
        pointer-events: none;
        z-index: 1;
        animation: pythonRoam 30s linear infinite;
        opacity: 0.7;
        filter: drop-shadow(0 0 15px rgba(55, 118, 171, 0.4));
        will-change: transform, opacity;
    }
    
    .python-snake svg {
        width: 100%;
        height: 100%;
        filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.15));
    }
    
    @keyframes pythonRoam {
        0% { 
            transform: translate(-120px, 10vh) rotate(0deg) scale(1); 
            opacity: 0.5; 
        }
        10% { 
            transform: translate(10vw, 5vh) rotate(36deg) scale(1.1); 
            opacity: 0.8; 
        }
        20% { 
            transform: translate(30vw, 15vh) rotate(72deg) scale(0.9); 
            opacity: 0.6; 
        }
        30% { 
            transform: translate(60vw, 8vh) rotate(108deg) scale(1.2); 
            opacity: 0.7; 
        }
        40% { 
            transform: translate(calc(100vw - 60px), 25vh) rotate(144deg) scale(1); 
            opacity: 0.5; 
        }
        50% { 
            transform: translate(calc(100vw + 60px), 50vh) rotate(180deg) scale(1.1); 
            opacity: 0.4; 
        }
        60% { 
            transform: translate(70vw, 75vh) rotate(216deg) scale(0.9); 
            opacity: 0.8; 
        }
        70% { 
            transform: translate(40vw, calc(100vh - 60px)) rotate(252deg) scale(1.2); 
            opacity: 0.6; 
        }
        80% { 
            transform: translate(10vw, 85vh) rotate(288deg) scale(1); 
            opacity: 0.7; 
        }
        90% { 
            transform: translate(-60px, 60vh) rotate(324deg) scale(1.1); 
            opacity: 0.5; 
        }
        100% { 
            transform: translate(-120px, 10vh) rotate(360deg) scale(1); 
            opacity: 0.5; 
        }
    }
    
    /* SECOND PYTHON SNAKE - REVERSE DIRECTION */
    .python-snake-2 {
        position: fixed;
        top: 0;
        left: 0;
        width: 100px;
        height: 100px;
        pointer-events: none;
        z-index: 1;
        animation: pythonRoamReverse 35s linear infinite;
        opacity: 0.5;
        filter: drop-shadow(0 0 10px rgba(255, 212, 59, 0.3));
        will-change: transform, opacity;
        animation-delay: -15s;
    }
    
    .python-snake-2 svg {
        width: 100%;
        height: 100%;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
    }
    
    @keyframes pythonRoamReverse {
        0% { 
            transform: translate(calc(100vw + 50px), 80vh) rotate(180deg) scale(0.8); 
            opacity: 0.3; 
        }
        10% { 
            transform: translate(80vw, 70vh) rotate(144deg) scale(1); 
            opacity: 0.6; 
        }
        20% { 
            transform: translate(60vw, 85vh) rotate(108deg) scale(0.9); 
            opacity: 0.4; 
        }
        30% { 
            transform: translate(30vw, 75vh) rotate(72deg) scale(1.1); 
            opacity: 0.5; 
        }
        40% { 
            transform: translate(10vw, 90vh) rotate(36deg) scale(0.8); 
            opacity: 0.3; 
        }
        50% { 
            transform: translate(-50px, 60vh) rotate(0deg) scale(1); 
            opacity: 0.6; 
        }
        60% { 
            transform: translate(20vw, 40vh) rotate(324deg) scale(0.9); 
            opacity: 0.4; 
        }
        70% { 
            transform: translate(50vw, 30vh) rotate(288deg) scale(1.2); 
            opacity: 0.5; 
        }
        80% { 
            transform: translate(75vw, 45vh) rotate(252deg) scale(0.8); 
            opacity: 0.3; 
        }
        90% { 
            transform: translate(90vw, 20vh) rotate(216deg) scale(1); 
            opacity: 0.6; 
        }
        100% { 
            transform: translate(calc(100vw + 50px), 80vh) rotate(180deg) scale(0.8); 
            opacity: 0.3; 
        }
    }
    
    /* SLEEK SOLID BOXES FOR ALL CONTENT */
    .main .block-container {
        background: rgba(255, 255, 255, 0.98) !important;
        border: 2px solid #e2e8f0 !important;
        border-radius: 15px !important;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07) !important;
        margin: 1.5rem auto !important;
        padding: 2.5rem !important;
        position: relative !important;
        z-index: 10 !important;
        max-width: 1200px !important;
    }
    
    /* FIXED SIDEBAR VISIBILITY */
    .stSidebar > div {
        background: rgba(255, 255, 255, 0.98) !important;
        border: 2px solid #e2e8f0 !important;
        border-radius: 12px !important;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07) !important;
        margin: 1rem !important;
        padding: 1.5rem !important;
        position: relative !important;
        z-index: 10 !important;
    }
    
    /* SLEEK TEXT - ALL BLACK FOR MAXIMUM VISIBILITY */
    .stMarkdown {
        font-size: 16px !important;
        line-height: 1.6 !important;
        color: #000000 !important;
        position: relative !important;
        z-index: 5 !important;
        font-weight: 400 !important;
    }
    
    .stMarkdown p {
        color: #000000 !important;
    }
    
    .stMarkdown div {
        color: #000000 !important;
    }
    
    /* CLEAN HEADERS - ALL BLACK */
    h1, h2, h3, h4, h5, h6 {
        color: #000000 !important;
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
        position: relative !important;
        z-index: 5 !important;
    }
    
    .stButton > button:hover {
        background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%) !important;
        transform: translateY(-1px) !important;
        color: white !important;
    }
    
    /* CLEAN INPUT FIELDS - BLACK TEXT */
    .stTextInput > div > div > input,
    .stTextArea > div > div > textarea,
    .stSelectbox > div > div {
        background: rgba(255, 255, 255, 0.95) !important;
        border: 1px solid #d1d5db !important;
        border-radius: 6px !important;
        padding: 0.75rem !important;
        color: #000000 !important;
        font-size: 0.95rem !important;
        position: relative !important;
        z-index: 5 !important;
        font-weight: 400 !important;
    }
    
    .stTextInput > div > div > input:focus,
    .stTextArea > div > div > textarea:focus {
        border-color: #667eea !important;
        outline: none !important;
        color: #000000 !important;
    }
    
    /* Make sure all input labels are black */
    .stTextInput > label,
    .stTextArea > label,
    .stSelectbox > label {
        color: #000000 !important;
        font-weight: 500 !important;
    }
    
    /* CLEAN SUCCESS/INFO/WARNING BOXES - BLACK TEXT */
    .stAlert {
        background: rgba(255, 255, 255, 0.95) !important;
        border-radius: 8px !important;
        border: 1px solid #e5e7eb !important;
        position: relative !important;
        z-index: 5 !important;
        color: #000000 !important;
    }
    
    .stAlert div {
        color: #000000 !important;
    }
    
    .stSuccess {
        color: #000000 !important;
    }
    
    .stInfo {
        color: #000000 !important;
    }
    
    .stWarning {
        color: #000000 !important;
    }
    
    .stError {
        color: #000000 !important;
    }
    
    /* CLEAN CODE BLOCKS */
    .stCodeBlock {
        background: rgba(248, 250, 252, 0.95) !important;
        border: 1px solid #e5e7eb !important;
        border-radius: 8px !important;
        position: relative !important;
        z-index: 5 !important;
    }
    
    /* Mobile responsive styles */
    @media (max-width: 768px) {
        .main .block-container {
            padding: 2rem 1.5rem !important;
            margin: 1rem 0.5rem !important;
        }
        
        .stSidebar > div {
            margin: 0.5rem !important;
            padding: 1rem !important;
        }
        
        .python-snake {
            width: 80px !important;
            height: 80px !important;
        }
        
        .python-snake-2 {
            width: 60px !important;
            height: 60px !important;
        }
    }
    
    /* Clean sidebar elements - ALL BLACK TEXT */
    .stSidebar .stMarkdown,
    .stSidebar .stButton,
    .stSidebar .stTextInput {
        color: #000000 !important;
    }
    
    .stSidebar h1, .stSidebar h2, .stSidebar h3 {
        color: #000000 !important;
    }
    
    .stSidebar p {
        color: #000000 !important;
    }
    
    .stSidebar div {
        color: #000000 !important;
    }
    
    /* Make sure all streamlit elements have black text */
    .element-container,
    .stMetric,
    .stColumns,
    .stTabs,
    .stExpander,
    .stSlider,
    .stCheckbox,
    .stRadio,
    .stMultiSelect {
        position: relative !important;
        z-index: 5 !important;
        color: #000000 !important;
    }
    
    /* Force all text elements to be black */
    * {
        color: #000000 !important;
    }
    
    /* Override any remaining text colors */
    span, div, p, label, text {
        color: #000000 !important;
    }
    
    /* Comprehensive text color override */
    .stApp * {
        color: #000000 !important;
    
    /* Make sure button text stays white on colored buttons - CLEANED UP */
    </style>
    """, unsafe_allow_html=True)
    
    # Add simple roaming Python snake background - very simple design
    st.markdown("""
    <div class="python-snake">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">
            <!-- Simple snake body made of overlapping circles -->
            <circle cx="30" cy="50" r="12" fill="#3776AB"/>
            <circle cx="45" cy="45" r="11" fill="#3776AB"/>
            <circle cx="60" cy="52" r="10" fill="#3776AB"/>
            <circle cx="75" cy="48" r="9" fill="#3776AB"/>
            <circle cx="90" cy="55" r="8" fill="#3776AB"/>
            <circle cx="105" cy="52" r="7" fill="#3776AB"/>
            <circle cx="120" cy="48" r="6" fill="#3776AB"/>
            <circle cx="135" cy="52" r="5" fill="#3776AB"/>
            <circle cx="150" cy="50" r="4" fill="#3776AB"/>
            
            <!-- Snake head - larger and different color -->
            <circle cx="30" cy="50" r="15" fill="#FFD43B" stroke="#3776AB" stroke-width="2"/>
            
            <!-- Simple eyes -->
            <circle cx="26" cy="46" r="3" fill="#000"/>
            <circle cx="26" cy="45" r="1" fill="#FFF"/>
            <circle cx="34" cy="46" r="3" fill="#000"/>
            <circle cx="34" cy="45" r="1" fill="#FFF"/>
            
            <!-- Simple forked tongue -->
            <path d="M20,52 L15,52 M13,50 L17,50 M13,54 L17,54" stroke="#FF0000" stroke-width="2" fill="none"/>
            
            <!-- Yellow belly stripe -->
            <ellipse cx="45" cy="48" rx="8" ry="3" fill="#FFD43B" opacity="0.7"/>
            <ellipse cx="60" cy="53" rx="7" ry="3" fill="#FFD43B" opacity="0.7"/>
            <ellipse cx="75" cy="50" rx="6" ry="3" fill="#FFD43B" opacity="0.7"/>
            <ellipse cx="90" cy="56" rx="5" ry="3" fill="#FFD43B" opacity="0.7"/>
            <ellipse cx="105" cy="53" rx="4" ry="3" fill="#FFD43B" opacity="0.7"/>
        </svg>
    </div>
    """, unsafe_allow_html=True)
    
    # Add second Python snake with simpler design
    st.markdown("""
    <div class="python-snake-2">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">
            <!-- Second simple snake with reverse colors -->
            <circle cx="170" cy="50" r="12" fill="#FFD43B"/>
            <circle cx="155" cy="45" r="11" fill="#FFD43B"/>
            <circle cx="140" cy="52" r="10" fill="#FFD43B"/>
            <circle cx="125" cy="48" r="9" fill="#FFD43B"/>
            <circle cx="110" cy="55" r="8" fill="#FFD43B"/>
            <circle cx="95" cy="52" r="7" fill="#FFD43B"/>
            <circle cx="80" cy="48" r="6" fill="#FFD43B"/>
            <circle cx="65" cy="52" r="5" fill="#FFD43B"/>
            <circle cx="50" cy="50" r="4" fill="#FFD43B"/>
            
            <!-- Snake head - larger and different color -->
            <circle cx="170" cy="50" r="15" fill="#3776AB" stroke="#FFD43B" stroke-width="2"/>
            
            <!-- Simple eyes -->
            <circle cx="174" cy="46" r="3" fill="#FFF"/>
            <circle cx="174" cy="45" r="1" fill="#000"/>
            <circle cx="166" cy="46" r="3" fill="#FFF"/>
            <circle cx="166" cy="45" r="1" fill="#000"/>
            
            <!-- Simple forked tongue -->
            <path d="M180,52 L185,52 M187,50 L183,50 M187,54 L183,54" stroke="#FF0000" stroke-width="2" fill="none"/>
            
            <!-- Blue belly stripe -->
            <ellipse cx="155" cy="48" rx="8" ry="3" fill="#3776AB" opacity="0.7"/>
            <ellipse cx="140" cy="53" rx="7" ry="3" fill="#3776AB" opacity="0.7"/>
            <ellipse cx="125" cy="50" rx="6" ry="3" fill="#3776AB" opacity="0.7"/>
            <ellipse cx="110" cy="56" rx="5" ry="3" fill="#3776AB" opacity="0.7"/>
            <ellipse cx="95" cy="53" rx="4" ry="3" fill="#3776AB" opacity="0.7"/>
        </svg>
    </div>
    """, unsafe_allow_html=True)
    
    # Header with back to selection option
    col1, col2, col3 = st.columns([1, 2, 1])
    with col1:
        if st.button("← Change Mentor", help="Go back to mentor selection"):
            st.session_state.show_selection_page = True
            st.session_state.selected_mentor = None
            st.rerun()
    
    with col2:
        st.markdown('<h1 class="main-header">🕰️ ChronoCoder</h1>', unsafe_allow_html=True)
    
    with col3:
        # Admin access in header
        if st.button("🔑 Admin", help="Access admin mode"):
            st.session_state.admin_mode = not st.session_state.admin_mode
    
    st.markdown("### *AI-Powered Mentor Chatbot for Python Learning*")
    st.markdown("**Created by Anubhav** | *Powered by 8 Legendary Programming Mentors* 🚀")
    
    # Display selected mentor
    if st.session_state.selected_mentor:
        try:
            mentor_greeting = st.session_state.mentor_personalities.get_mentor_greeting(st.session_state.selected_mentor)
            st.success(f"🎯 **Your Mentor:** {st.session_state.selected_mentor}")
            st.info(f"💬 {mentor_greeting}")
        except Exception as e:
            st.success(f"🎯 **Your Mentor:** {st.session_state.selected_mentor}")
            st.info("💬 Welcome! I'm ready to help you with your Python code!")
    
    # Check for admin mode activation
    admin_trigger = st.sidebar.text_input("🔑 Admin Access", type="password", placeholder="Admin code")
    if admin_trigger == "anubhav_admin_2025" and not st.session_state.admin_mode:
        st.session_state.admin_mode = True
        st.success("🚀 Admin mode available for Anubhav!")
    
    # Show admin panel if activated
    if st.session_state.admin_mode:
        admin_panel()
    
    st.markdown("---")
    
    # Sidebar for session info and options
    with st.sidebar:
        st.header(f"🎯 Current Mentor")
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
        if st.button("Save Session"):
            try:
                filepath = st.session_state.session_logger.save_session()
                st.success(f"Session saved to: {os.path.basename(filepath)}")
            except Exception as e:
                st.error(f"❌ Failed to save session: {str(e)}")
        
        if st.button("Export to Markdown") and st.session_state.history:
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
        
        # Credits and Easter Eggs
        st.header("🎯 About")
        st.markdown("**Created by:** Anubhav")
        st.markdown("**Built with:** Python, Streamlit & ❤️")
        
        # Easter egg - click counter
        if 'click_count' not in st.session_state:
            st.session_state.click_count = 0
        
        if st.button("🥚 Secret Button"):
            st.session_state.click_count += 1
            if st.session_state.click_count == 1:
                st.balloons()
                st.success("🎉 You found the first easter egg!")
            elif st.session_state.click_count == 5:
                st.balloons()
                st.success("🏆 Persistent! You've clicked 5 times!")
            elif st.session_state.click_count == 10:
                st.balloons()
                st.success("🚀 Dedication level: MAXIMUM! (10 clicks)")
            elif st.session_state.click_count > 10:
                st.success(f"🔥 You're unstoppable! Click #{st.session_state.click_count}")
        
        if st.session_state.click_count > 0:
            st.caption(f"🎯 Secret clicks: {st.session_state.click_count}")
    
    # Main content area
    col1, col2 = st.columns([1, 1])
    
    with col1:
        st.header("📝 Your Python Code")
        
        # Code input area
        user_code = st.text_area(
            "Paste your Python code here:",
            height=300,
            placeholder="""# Example - try some easter eggs!
def greet(name):
    return f"Hello, World! Nice to meet you, {name}!"

# Try: fibonacci, AI code, or mention 'anubhav'
print(greet("Anubhav"))

# Secret: try typing 'easter egg' in your code!""",
            help="Enter any Python code you'd like your mentor to review. 🥚 Hidden: Try 'Hello World', 'fibonacci', or mention other mentors!"
        )
        
        # Analysis button
        analyze_button = st.button("🔍 Get Mentor Feedback", type="primary")
        
        # Validation message
        if analyze_button and not user_code.strip():
            st.warning("⚠️ Please enter some Python code to analyze!")
        elif analyze_button and not st.session_state.selected_mentor:
            st.warning("⚠️ Please select a mentor first!")
        
        # Easter egg - Konami code simulation
        if st.button("⬆️⬆️⬇️⬇️⬅️➡️⬅️➡️🅱️🅰️"):
            st.balloons()
            st.success("🎮 Konami Code activated! You're a true developer!")
            st.code("""
# 🎉 CONGRATULATIONS! 🎉
# You found the Konami Code easter egg!
# Here's a special message from all mentors:

def konami_appreciation():
    mentors = ['Ada', 'Linus', 'Grace', 'Alan', 'Margaret', 'Dennis', 'Barbara', 'Guido']
    return f"Thanks for exploring ChronoCoder! - {', '.join(mentors)}"
            """, language="python")
        
        # Code analysis and feedback
        if analyze_button and user_code.strip() and st.session_state.selected_mentor:
            try:
                with st.spinner(f"{st.session_state.selected_mentor} is analyzing your code..."):
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
        st.markdown("**🥚 Easter Eggs:** Hidden throughout the app!")
    
    with footer_col3:
        st.markdown("**💝 Special Thanks:**")
        st.markdown("• GitHub Copilot for development assistance")
        st.markdown("• The legendary programmers who inspire us")
        st.markdown("• You, for using ChronoCoder! 🚀")
    
    # Copyright and admin access hint
    st.markdown("---")
    st.markdown(
        "<div style='text-align: center;'>"
        "<small>© 2025 ChronoCoder by Anubhav | Educational Open Source Project | "
        "<span style='color: #000000;'>Psst... admins might find special access in the sidebar 😉</span>"
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
                result = anubhav_admin.execute_admin_command("ai_mode gpt-4 copilot")
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