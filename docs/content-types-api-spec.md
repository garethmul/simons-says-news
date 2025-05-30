# Content Types Auto-Discovery API Specification

## 🎯 **Overview**

This specification outlines how to implement auto-discovery of prompt templates without requiring frontend code changes. When new prompt templates are added, the system automatically detects and presents them in the UI.

## 📋 **API Endpoint**

### `GET /api/eden/content/types`

Returns a list of all available content types/prompt templates with their metadata.

**Response Format:**
```json
{
  "success": true,
  "contentTypes": [
    {
      "id": "article",
      "name": "Blog Article",
      "icon": "FileText",
      "category": "blog",
      "description": "Generates engaging blog posts from news stories",
      "template": "Blog Post Generator",
      "enabled": true,
      "priority": 1
    },
    {
      "id": "social_post",
      "name": "Social Media",
      "icon": "Share2", 
      "category": "social",
      "description": "Creates social media posts for various platforms",
      "template": "Social Media Generator",
      "enabled": true,
      "priority": 2
    },
    {
      "id": "video_script",
      "name": "Video Script",
      "icon": "Video",
      "category": "video", 
      "description": "Generates video scripts for content creation",
      "template": "Video Script Generator",
      "enabled": true,
      "priority": 3
    },
    {
      "id": "prayer_points",
      "name": "Prayer Points",
      "icon": "Heart",
      "category": "prayer",
      "description": "Creates prayer points from news stories",
      "template": "Prayer Points",
      "enabled": true,
      "priority": 4
    }
  ]
}
```

## 🔧 **Backend Implementation Strategy**

### **Option 1: Template File Metadata (Recommended)**

Add metadata headers to each prompt template file:

```yaml
# templates/blog_post.yaml
metadata:
  id: "article"
  name: "Blog Article"
  icon: "FileText"
  category: "blog"
  description: "Generates engaging blog posts from news stories"
  enabled: true
  priority: 1

prompts:
  system: "You are a Christian content writer..."
  # ... rest of template
```

**Implementation:**
```python
def scan_content_types():
    """Scan template directory and extract metadata"""
    content_types = []
    template_dir = os.path.join(os.path.dirname(__file__), 'templates')
    
    for file_path in glob.glob(os.path.join(template_dir, '*.yaml')):
        try:
            with open(file_path, 'r') as f:
                template = yaml.safe_load(f)
                
            if 'metadata' in template:
                metadata = template['metadata']
                content_types.append({
                    'id': metadata.get('id'),
                    'name': metadata.get('name'),
                    'icon': metadata.get('icon', 'FileText'),
                    'category': metadata.get('category', 'general'),
                    'description': metadata.get('description', ''),
                    'template': os.path.basename(file_path).replace('.yaml', ''),
                    'enabled': metadata.get('enabled', True),
                    'priority': metadata.get('priority', 999)
                })
        except Exception as e:
            print(f"Error loading template {file_path}: {e}")
    
    # Sort by priority
    content_types.sort(key=lambda x: x['priority'])
    return content_types
```

### **Option 2: Convention-Based Discovery**

Use file naming conventions with a central mapping:

```python
# content_types_config.py
CONTENT_TYPE_MAPPING = {
    'blog_post': {
        'name': 'Blog Article',
        'icon': 'FileText',
        'category': 'blog',
        'description': 'Generates engaging blog posts'
    },
    'prayer_points': {
        'name': 'Prayer Points', 
        'icon': 'Heart',
        'category': 'prayer',
        'description': 'Creates prayer points from news'
    }
    # Add new templates here
}

def discover_content_types():
    """Discover templates and map to configuration"""
    template_files = glob.glob('templates/*.yaml')
    content_types = []
    
    for file_path in template_files:
        file_name = os.path.basename(file_path).replace('.yaml', '')
        
        if file_name in CONTENT_TYPE_MAPPING:
            config = CONTENT_TYPE_MAPPING[file_name]
            content_types.append({
                'id': file_name,
                'template': file_name,
                **config
            })
    
    return content_types
```

### **Option 3: Database-Driven Configuration**

Store content type metadata in database:

```sql
CREATE TABLE content_types (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50) DEFAULT 'FileText',
    category VARCHAR(50) DEFAULT 'general',
    description TEXT,
    template_file VARCHAR(100) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 999,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔤 **Available Icons**

Frontend supports these Lucide icons:
- `FileText` (articles, general content)
- `Share2` (social media)
- `Video` (video scripts)
- `Heart` (prayer points, devotional)
- `Image` (visual content)
- `Star` (featured content)
- `Clock` (time-sensitive)
- `Eye` (preview/review)
- `Check` (approved)
- `X` (rejected)

## 📝 **Content Type Categories**

Suggested categories for organization:
- `blog` - Blog articles and posts
- `social` - Social media content
- `video` - Video scripts and multimedia
- `prayer` - Prayer points and devotional
- `news` - News-related content
- `general` - Uncategorized content

## 🚀 **Adding New Content Types**

### **Process for Content Creators:**

1. **Create Template File**: `templates/new_content_type.yaml`
2. **Add Metadata Header**:
   ```yaml
   metadata:
     id: "new_content_type"
     name: "New Content Type"
     icon: "FileText"
     category: "general"
     description: "Description of what this generates"
     enabled: true
     priority: 5
   ```
3. **Deploy** - Frontend automatically picks up new type

### **No Code Changes Required!**

✅ Frontend automatically discovers new types  
✅ Filter dropdowns update automatically  
✅ Content cards display correct names/icons  
✅ Associated content badges work  

## 🔄 **Backwards Compatibility**

The frontend includes fallback support:
- Unknown content types show as generic "Content"
- Missing icons default to `FileText`
- If API fails, uses hardcoded fallback types

## 🧪 **Testing the Implementation**

1. **Add Test Template**:
   ```yaml
   # templates/test_sermon.yaml
   metadata:
     id: "sermon_notes"
     name: "Sermon Notes"
     icon: "Star"
     category: "sermon"
     description: "Generates sermon notes and outlines"
     enabled: true
     priority: 5
   ```

2. **Verify API Response**:
   ```bash
   curl -X GET /api/eden/content/types
   ```

3. **Check Frontend**:
   - New "Sermon Notes" appears in filters
   - Content cards show correct icon/name
   - No code changes needed

## 📊 **Expected Benefits**

- ⚡ **Zero frontend changes** for new content types
- 🔄 **Automatic discovery** of new templates
- 🎨 **Consistent UI** for all content types
- 📈 **Scalable system** for content expansion
- 🛠️ **Template-driven development**

## 🔧 **Implementation Checklist**

- [ ] Choose implementation strategy (metadata recommended)
- [ ] Create `/api/eden/content/types` endpoint
- [ ] Add metadata to existing templates
- [ ] Test with new template
- [ ] Verify frontend auto-discovery
- [ ] Document template creation process

---

**Note**: This system enables content creators to add new prompt templates without requiring developer intervention for frontend updates. 