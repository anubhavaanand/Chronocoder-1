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
import streamlit.components.v1 as components
import os
import hmac
from datetime import datetime

# Import our custom modules
try:
    from mentors import MentorPersonalities
    from code_parser import CodeAnalyzer
    from utils import SessionLogger, CodeFormatter, FileManager
    from anubhav_admin import anubhav_admin  # Admin mode for Anubhav
    import styles
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
    """Display the ChronoCoder Archive gallery - Retro Computing Theme."""
    from themes import MENTOR_THEMES

    # Apply the complete retro computing design system
    st.markdown(styles.get_selection_css(), unsafe_allow_html=True)

    # Full-bleed animated Three.js hero scene
    components.html(styles.hero_scene_html(), height=520, scrolling=False)

    # Exhibit data - era pigments & labels come from the theme registry
    exhibit_meta = {
        "Ada Lovelace": {
            "title": "The Enchantress of Numbers",
            "icon": "🔮",
            "description": "Experience coding through the lens of mathematical poetry and algorithmic beauty.",
        },
        "Linus Torvalds": {
            "title": "The Kernel Master",
            "icon": "🐧",
            "description": "Get straight-to-the-point feedback with a focus on efficiency and real-world performance.",
        },
        "Grace Hopper": {
            "title": "The Debugging Admiral",
            "icon": "🚢",
            "description": "Learn through methodical debugging and step-by-step problem-solving techniques.",
        },
        "Alan Turing": {
            "title": "The Computation Pioneer",
            "icon": "🧠",
            "description": "Explore the theoretical foundations and computational possibilities of your code.",
        },
        "Margaret Hamilton": {
            "title": "The Software Engineer",
            "icon": "🚀",
            "description": "Ensure your code is reliable, error-free, and mission-critical ready.",
        },
        "Dennis Ritchie": {
            "title": "The Language Architect",
            "icon": "⚡",
            "description": "Write clean, efficient code that stands the test of time with minimalist elegance.",
        },
        "Barbara Liskov": {
            "title": "The Design Theorist",
            "icon": "🏛️",
            "description": "Master software design principles and elegant abstraction techniques.",
        },
        "Guido van Rossum": {
            "title": "The Python Creator",
            "icon": "🐍",
            "description": "Make your code beautiful and Pythonic with the wisdom of Python's creator.",
        },
    }

    # Create mentor exhibit plaques
    col1, col2 = st.columns(2)

    mentor_names = list(exhibit_meta.keys())
    for i, mentor_name in enumerate(mentor_names):
        meta = exhibit_meta[mentor_name]
        theme = MENTOR_THEMES[mentor_name]

        with col1 if i % 2 == 0 else col2:
            card_html = f"""
            <div class="cc-exhibit" style="--accent: {theme['accent']}">
                <div class="cc-exhibit-no">EXHIBIT {theme['exhibit_no']} &middot; {theme['era_label'].upper()} &middot; {theme['era_year'].upper()}</div>
                <span class="cc-exhibit-icon">{meta['icon']}</span>
                <div class="cc-exhibit-name">{mentor_name}</div>
                <div class="cc-exhibit-title">{meta['title']}</div>
                <div class="cc-exhibit-desc">{meta['description']}</div>
                <div class="cc-exhibit-tags">&ldquo;{theme['tagline']}&rdquo;</div>
            </div>
            """
            st.markdown(card_html, unsafe_allow_html=True)

            if st.button(f"Study under {mentor_name.split()[-1]} →", key=f"select_{mentor_name}", help=f"Choose {mentor_name} as your coding mentor"):
                st.session_state.selected_mentor = mentor_name
                st.session_state.show_selection_page = False
                st.rerun()

    # Placard footer
    st.markdown("---")
    st.markdown("""
    <div class="cc-placard">
        <h3>How it works</h3>
        <p>Each mentor reviews your code in their own voice and by their own standards — Ada weighs elegance,
        Linus inspects your data structures, Hamilton hunts edge cases. Pick the mind you want breathing down your neck.</p>
        <p class="cc-fineprint">Code analysis &middot; Gemini-powered critique &middot; session logging</p>
        <p class="cc-fineprint">The ChronoCoder Archive &middot; curated by Anubhav</p>
    </div>
    """, unsafe_allow_html=True)

def main():
    """Main Streamlit application."""
    
    # Show mentor selection page first
    if st.session_state.show_selection_page:
        mentor_selection_page()
        return
    
    # Dark Time Travel theme - workspace styles
    st.markdown(styles.get_app_css(), unsafe_allow_html=True)

    # Per-mentor world: re-tint chrome with the mentor's era pigment
    import scenes
    from themes import get_mentor_theme
    mentor_theme = get_mentor_theme(st.session_state.selected_mentor)
    st.markdown(
        styles.get_mentor_workspace_css(mentor_theme["accent"], mentor_theme["accent_soft"]),
        unsafe_allow_html=True,
    )

    # Mentor hero: their signature 3D scene + exhibit placard (Three.js / ASCII)
    components.html(scenes.get_hero_scene(st.session_state.selected_mentor), height=380, scrolling=False)

    # Header navigation bar layout
    nav_col1, nav_col2 = st.columns([1, 4])
    with nav_col1:
        if st.button("← Back to the Archive", help="Return to mentor selection"):
            st.session_state.show_selection_page = True
            st.session_state.selected_mentor = None
            st.rerun()

    with nav_col2:
        st.markdown(
            f'<div class="cc-plaque"><span class="no">EXHIBIT {mentor_theme["exhibit_no"]}</span>'
            f'<span class="name">{st.session_state.selected_mentor}</span>'
            f'<span class="era">{mentor_theme["era_label"]} · {mentor_theme["era_year"]}</span></div>',
            unsafe_allow_html=True,
        )

    
    # Mentor greeting - accent plaque instead of native alert boxes
    if st.session_state.selected_mentor:
        try:
            mentor_greeting = st.session_state.mentor_personalities.get_mentor_greeting(st.session_state.selected_mentor)
        except Exception:
            mentor_greeting = "Welcome! I'm ready to help you with your Python code!"
        st.markdown(f'<div class="cc-greeting">{mentor_greeting}</div>', unsafe_allow_html=True)
    
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
            st.markdown("*Click 'Back to the Archive' above to switch*")
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
    
    # Main content area with enhanced headers
    col1, col2 = st.columns([1, 1])
    
    with col1:
        # Terminal-style header for code input
        st.markdown("""
        <div class="cc-terminal-header">
            <div class="cc-terminal-dots">
                <div class="cc-terminal-dot red"></div>
                <div class="cc-terminal-dot yellow"></div>
                <div class="cc-terminal-dot green"></div>
            </div>
            <span class="cc-terminal-title">EDITOR — python_code.py</span>
        </div>
        """, unsafe_allow_html=True)
        
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
        # Terminal-style header for feedback panel
        st.markdown("""
        <div class="cc-terminal-header">
            <div class="cc-terminal-dots">
                <div class="cc-terminal-dot red"></div>
                <div class="cc-terminal-dot yellow"></div>
                <div class="cc-terminal-dot green"></div>
            </div>
            <span class="cc-terminal-title">TERMINAL — mentor_feedback.txt</span>
        </div>
        """, unsafe_allow_html=True)
        
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
    
    # Enhanced retro-themed footer
    st.markdown("""
    <div class="cc-footer-section">
        <div class="cc-creator-badge">✨ Created by Anubhav</div>
    </div>
    """, unsafe_allow_html=True)
    
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
        "<span style='color: #8ea0c9;'>Psst... admins can toggle access panel in the sidebar 😉</span>"
        "</small></div>", 
        unsafe_allow_html=True
    )

def admin_panel():
    """Special admin panel for Anubhav with unrestricted access - Retro Edition."""
    
    # Terminal-style header for admin panel
    st.markdown("""
    <div class="cc-terminal-header">
        <div class="cc-terminal-dots">
            <div class="cc-terminal-dot red"></div>
            <div class="cc-terminal-dot yellow"></div>
            <div class="cc-terminal-dot green"></div>
        </div>
        <span class="cc-terminal-title">ADMIN_CONSOLE — root_access</span>
    </div>
    """, unsafe_allow_html=True)
    
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