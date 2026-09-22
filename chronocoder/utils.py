"""
Utility functions for ChronoCoder

Helper functions for logging, session management, and file operations.
"""

import os
import json
from datetime import datetime
from typing import Dict, Any

class SessionLogger:
    """Handles session logging and history management."""
    
    def __init__(self, log_dir: str = "logs"):
        self.log_dir = log_dir
        self.ensure_log_directory()
        self.current_session = self.create_session()
    
    def ensure_log_directory(self):
        """Create logs directory if it doesn't exist."""
        os.makedirs(self.log_dir, exist_ok=True)
    
    def create_session(self) -> Dict[str, Any]:
        """Create a new session with timestamp."""
        return {
            "session_id": datetime.now().strftime("%Y%m%d_%H%M%S"),
            "start_time": datetime.now().isoformat(),
            "interactions": [],
            "mentor_used": None,
            "total_code_submissions": 0
        }
    
    def log_interaction(self, user_code: str, mentor: str, feedback: str, analysis: Dict[str, Any]):
        """Log a single interaction between user and mentor."""
        interaction = {
            "timestamp": datetime.now().isoformat(),
            "user_code": user_code,
            "mentor": mentor,
            "feedback": feedback,
            "code_analysis": analysis,
            "code_length": len(user_code),
            "complexity_score": analysis.get('complexity_score', 0)
        }
        
        self.current_session["interactions"].append(interaction)
        self.current_session["mentor_used"] = mentor
        self.current_session["total_code_submissions"] += 1
    
    def save_session(self) -> str:
        """Save current session to file and return filename."""
        filename = f"session_{self.current_session['session_id']}.json"
        filepath = os.path.join(self.log_dir, filename)
        
        # Add end time to session
        self.current_session["end_time"] = datetime.now().isoformat()
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(self.current_session, f, indent=2, ensure_ascii=False)
        
        return filepath
    
    def get_session_summary(self) -> str:
        """Get a summary of the current session."""
        if not self.current_session["interactions"]:
            return "No interactions in this session yet."
        
        total_interactions = len(self.current_session["interactions"])
        mentor = self.current_session["mentor_used"]
        avg_complexity = sum(i.get("complexity_score", 0) for i in self.current_session["interactions"]) / total_interactions
        
        return f"""
📊 **Session Summary**
• Total interactions: {total_interactions}
• Mentor: {mentor}
• Average code complexity: {avg_complexity:.1f}
• Session duration: {self._get_session_duration()}
        """.strip()
    
    def _get_session_duration(self) -> str:
        """Calculate session duration."""
        start = datetime.fromisoformat(self.current_session["start_time"])
        now = datetime.now()
        duration = now - start
        
        minutes = duration.total_seconds() / 60
        if minutes < 1:
            return f"{int(duration.total_seconds())} seconds"
        else:
            return f"{int(minutes)} minutes"

    def reset_session(self):
        """Start a fresh session."""
        self.current_session = self.create_session()

class CodeFormatter:
    """Utility functions for formatting code and text."""
    
    @staticmethod
    def format_code_block(code: str, language: str = "python") -> str:
        """Format code with proper markdown syntax highlighting."""
        return f"```{language}\n{code}\n```"
    
    @staticmethod
    def truncate_text(text: str, max_length: int = 100) -> str:
        """Truncate text to specified length with ellipsis."""
        if len(text) <= max_length:
            return text
        return text[:max_length-3] + "..."
    
    @staticmethod
    def clean_code_input(code: str) -> str:
        """Clean and normalize user code input."""
        # Remove excessive whitespace
        lines = [line.rstrip() for line in code.split('\n')]
        
        # Remove empty lines at start and end
        while lines and not lines[0].strip():
            lines.pop(0)
        while lines and not lines[-1].strip():
            lines.pop()
        
        return '\n'.join(lines)

class FileManager:
    """Handles file operations for exporting and importing sessions."""
    
    @staticmethod
    def export_session_to_markdown(session_data: Dict[str, Any], output_path: str) -> bool:
        """Export session data to a markdown file."""
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(f"# ChronoCoder Session Report\n\n")
                f.write(f"**Session ID:** {session_data['session_id']}\n")
                f.write(f"**Start Time:** {session_data['start_time']}\n")
                f.write(f"**Mentor:** {session_data.get('mentor_used', 'Unknown')}\n")
                f.write(f"**Total Interactions:** {len(session_data['interactions'])}\n\n")
                
                for i, interaction in enumerate(session_data['interactions'], 1):
                    f.write(f"## Interaction {i}\n\n")
                    f.write(f"**Time:** {interaction['timestamp']}\n\n")
                    f.write(f"**Your Code:**\n")
                    f.write(f"```python\n{interaction['user_code']}\n```\n\n")
                    f.write(f"**{interaction['mentor']}'s Feedback:**\n")
                    f.write(f"{interaction['feedback']}\n\n")
                    f.write("---\n\n")
            
            return True
        except Exception as e:
            print(f"Error exporting to markdown: {e}")
            return False
    

