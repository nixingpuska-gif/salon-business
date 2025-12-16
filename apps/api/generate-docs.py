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
            f.write("This document provides a detailed overview of the Salon Platform API endpoints.\n\n")

            f.write("## Authentication\n\n")
            f.write("Most endpoints require a JWT token for authentication. The token should be provided in the `Authorization` header as a Bearer token.\n\n`Authorization: Bearer <YOUR_JWT_TOKEN>`\n\n")

            f.write("## Endpoints\n\n")

            paths = data.get('paths', {})
            print(f"Found {len(paths)} paths.")

            for path, methods in paths.items():
                for method, details in methods.items():
                    f.write(f"### `{method.upper()}` {path}\n\n")
                    
                    summary = details.get('summary', '')
                    if summary:
                        f.write(f"**Summary:** {summary}\n\n")

                    description = details.get('description', '')
                    if description:
                        f.write(f"{description}\n\n")

                    # Parameters
                    if 'parameters' in details:
                        f.write("**Parameters:**\n\n")
                        f.write("| Name | In | Description | Required | Schema |\n")
                        f.write("|------|----|-------------|----------|--------|\n")
                        for param in details['parameters']:
                            param_name = param.get('name', '')
                            param_in = param.get('in', '')
                            param_desc = param.get('description', '')
                            param_req = param.get('required', False)
                            param_schema = json.dumps(param.get('schema', {}))
                            f.write(f"| `{param_name}` | {param_in} | {param_desc} | {param_req} | `{param_schema}` |\n")
                        f.write("\n")

                    # Request Body
                    if 'requestBody' in details:
                        f.write("**Request Body:**\n\n")
                        content = details['requestBody'].get('content', {})
                        for media_type, media_details in content.items():
                            schema_ref = media_details.get('schema', {}).get('$ref', '')
                            if schema_ref:
                                schema_name = schema_ref.split('/')[-1]
                                f.write(f"Content-Type: `{media_type}`\n")
                                f.write(f"Schema: `#/components/schemas/{schema_name}`\n\n")
                                # Optionally, display schema details
                                schema_details = data.get('components', {}).get('schemas', {}).get(schema_name, {})
                                if schema_details:
                                    f.write("```json\n")
                                    f.write(json.dumps(schema_details, indent=2))
                                    f.write("\n```\n\n")

                    # Responses
                    if 'responses' in details:
                        f.write("**Responses:**\n\n")
                        f.write("| Status Code | Description | Content |\n")
                        f.write("|-------------|-------------|---------|\n")
                        for status_code, response_details in details['responses'].items():
                            res_desc = response_details.get('description', '')
                            res_content = ''
                            if 'content' in response_details:
                                res_content = ', '.join(response_details['content'].keys())
                            f.write(f"| {status_code} | {res_desc} | `{res_content}` |\n")
                        f.write("\n")

                    f.write("---\n\n")
        print(f"API documentation generated at {output_file}")

    except Exception as e:
        print(f"Error writing to output file: {e}", file=sys.stderr)

if __name__ == "__main__":
    generate_api_docs('swagger.json', 'API_DOCUMENTATION.md')
'''
