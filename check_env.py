import sys
import subprocess

print("---PYTHON VERSION---")
print(sys.version)

print("\n---PIP LIST---")
try:
    result = subprocess.check_output([sys.executable, '-m', 'pip', 'list']).decode('utf-8')
    print(result)
except Exception as e:
    print(f"Error running pip list: {e}")
