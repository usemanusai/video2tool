# {{ data.get('title', 'Software Specification') }}

{% if data.get('metadata') %}
## Metadata

{% for key, value in data.get('metadata', {}).items() %}
- **{{ key }}:** {{ value }}
{% endfor %}
{% endif %}

{% if data.get('summary') %}
## Summary

{{ data.get('summary', {}).get('full_text', '') }}
{% endif %}

{% if data.get('specification') %}
## Software Specification

{% if data.get('specification', {}).get('overview') %}
### Overview

{{ data.get('specification', {}).get('overview', {}).get('text', '') }}
{% endif %}

{% if data.get('specification', {}).get('functional_requirements') %}
### Functional Requirements

{% for req in data.get('specification', {}).get('functional_requirements', []) %}
- {{ req }}
{% endfor %}
{% endif %}

{% if data.get('specification', {}).get('non_functional_requirements') %}
### Non-Functional Requirements

{% for req in data.get('specification', {}).get('non_functional_requirements', []) %}
- {{ req }}
{% endfor %}
{% endif %}

{% if data.get('specification', {}).get('user_stories') %}
### User Stories

{% for story in data.get('specification', {}).get('user_stories', []) %}
- As a **{{ story.get('user_type', '') }}**, I want to {{ story.get('action', '') }}{% if story.get('benefit') %} so that {{ story.get('benefit', '') }}{% endif %}
{% if story.get('acceptance_criteria') %}
  - Acceptance Criteria:
{% for criteria in story.get('acceptance_criteria', []) %}
    - {{ criteria }}
{% endfor %}
{% endif %}
{% endfor %}
{% endif %}

{% if data.get('specification', {}).get('data_models') %}
### Data Models

{{ data.get('specification', {}).get('data_models', {}).get('text', '') }}

{% if data.get('specification', {}).get('data_models', {}).get('entities') %}
#### Entities

{% for entity in data.get('specification', {}).get('data_models', {}).get('entities', []) %}
- **{{ entity.get('name', '') }}**
{% for field in entity.get('fields', []) %}
  - {{ field.get('name', '') }}: {{ field.get('type', '') }}{% if field.get('description') %} - {{ field.get('description', '') }}{% endif %}
{% endfor %}
{% endfor %}
{% endif %}
{% endif %}

{% if data.get('specification', {}).get('api_endpoints') %}
### API Endpoints

{% for endpoint in data.get('specification', {}).get('api_endpoints', []) %}
- **{{ endpoint.get('method', '') }} {{ endpoint.get('path', '') }}**
  - Description: {{ endpoint.get('description', '') }}
{% if endpoint.get('request_params') %}
  - Request Parameters:
{% for param in endpoint.get('request_params', []) %}
    - {{ param.get('name', '') }}: {{ param.get('type', '') }}{% if param.get('description') %} - {{ param.get('description', '') }}{% endif %}
{% endfor %}
{% endif %}
{% if endpoint.get('response') %}
  - Response: {{ endpoint.get('response', '') }}
{% endif %}
{% endfor %}
{% endif %}

{% if data.get('specification', {}).get('ui_ux_specifications') %}
### UI/UX Specifications

{{ data.get('specification', {}).get('ui_ux_specifications', '') }}
{% endif %}
{% endif %}

{% if data.get('tasks') %}
## Development Tasks

{% for task in data.get('tasks', {}).get('tasks', []) %}
### {{ task.get('id', '') }}: {{ task.get('name', '') }}

- **Category:** {{ task.get('category', '') }}
- **Priority:** {{ task.get('priority', '') }}
- **Estimate:** {{ task.get('estimate', '') }}
{% if task.get('description') %}
- **Description:** {{ task.get('description', '') }}
{% endif %}
{% if task.get('dependencies') %}
- **Dependencies:** {{ ', '.join(task.get('dependencies', [])) }}
{% endif %}
{% if task.get('notes') %}
- **Notes:** {{ task.get('notes', '') }}
{% endif %}

{% endfor %}
{% endif %}
