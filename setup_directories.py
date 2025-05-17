"""
Script to set up the project directory structure.
"""

import os

# Create main directories
directories = [
    "video_processor",
    "prompt_engineering",
    "task_generation",
    "api",
    "utils",
    "static",
    "templates",
    "tests",
    "temp",
    "output"
]

# Create __init__.py files for Python packages
packages = [
    "video_processor",
    "prompt_engineering",
    "task_generation",
    "api",
    "utils",
]

def setup_directories():
    """Create the project directory structure."""
    # Create directories
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        print(f"Created directory: {directory}")
    
    # Create __init__.py files
    for package in packages:
        init_file = os.path.join(package, "__init__.py")
        with open(init_file, "w") as f:
            f.write(f'"""\n{package.replace("_", " ").title()} package.\n"""\n')
        print(f"Created file: {init_file}")

if __name__ == "__main__":
    setup_directories()
    print("Directory setup complete.")
