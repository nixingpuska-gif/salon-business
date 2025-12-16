'''
import json
import sys

def generate_api_docs(swagger_file, output_file):
    print(f"Starting documentation generation from {swagger_file} to {output_file}")
    try:
        with open(swagger_file, 'r') as f:
            data = json.load(f)
        print("Swagger JSON loaded successfully.")
    except Exception as e:
        print(f"Error loading swagger file: {e}", file=sys.stderr)
        return

    try:
        with open(output_file, 'w') as f:
            f.write("# Salon Platform API Documentation\n\n")
        print(f"API documentation generated at {output_file}")
    except Exception as e:
        print(f"Error writing to output file: {e}", file=sys.stderr)

if __name__ == "__main__":
    generate_api_docs('swagger.json', 'API_DOCUMENTATION.md')
'''
