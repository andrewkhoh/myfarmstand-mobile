import React, { useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { useDropzone } from 'react-dropzone';
import type { Content, ContentStatus } from '../schema';

interface ContentEditorProps {
  content?: Content;
  onSave: (data: Partial<Content>) => void;
  onCancel: () => void;
  onStatusChange?: (status: ContentStatus) => void;
}

export const ContentEditor: React.FC<ContentEditorProps> = ({
  content,
  onSave,
  onCancel,
  onStatusChange
}) => {
  const [title, setTitle] = useState(content?.title || '');
  const [excerpt, setExcerpt] = useState(content?.excerpt || '');
  const [tags, setTags] = useState<string[]>(content?.tags || []);
  const [seo, setSeo] = useState(content?.seo || {});
  const [images, setImages] = useState(content?.images || []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        HTMLAttributes: {
          class: 'content-image',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    ],
    content: content?.body || '<p>Start writing your content...</p>',
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        if (editor) {
          editor.chain().focus().setImage({ src: url }).run();
        }
        setImages(prev => [...prev, {
          id: Date.now().toString(),
          url,
          alt: file.name,
        }]);
      };
      reader.readAsDataURL(file);
    });
  }, [editor]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    noClick: true,
  });

  const handleSave = () => {
    if (!editor) return;

    const data: Partial<Content> = {
      title,
      body: editor.getHTML(),
      excerpt,
      tags,
      seo,
      images,
      updatedAt: new Date().toISOString(),
    };

    onSave(data);
  };

  const handleTagAdd = (tag: string) => {
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  };

  const handleTagRemove = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const formatTools = [
    {
      name: 'bold',
      icon: 'B',
      action: () => editor?.chain().focus().toggleBold().run(),
      isActive: editor?.isActive('bold'),
    },
    {
      name: 'italic',
      icon: 'I',
      action: () => editor?.chain().focus().toggleItalic().run(),
      isActive: editor?.isActive('italic'),
    },
    {
      name: 'heading1',
      icon: 'H1',
      action: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: editor?.isActive('heading', { level: 1 }),
    },
    {
      name: 'heading2',
      icon: 'H2',
      action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor?.isActive('heading', { level: 2 }),
    },
    {
      name: 'bulletList',
      icon: '•',
      action: () => editor?.chain().focus().toggleBulletList().run(),
      isActive: editor?.isActive('bulletList'),
    },
    {
      name: 'orderedList',
      icon: '1.',
      action: () => editor?.chain().focus().toggleOrderedList().run(),
      isActive: editor?.isActive('orderedList'),
    },
    {
      name: 'blockquote',
      icon: '"',
      action: () => editor?.chain().focus().toggleBlockquote().run(),
      isActive: editor?.isActive('blockquote'),
    },
    {
      name: 'link',
      icon: '🔗',
      action: () => {
        const url = window.prompt('Enter URL:');
        if (url) {
          editor?.chain().focus().setLink({ href: url }).run();
        }
      },
      isActive: editor?.isActive('link'),
    },
  ];

  return (
    <div className="content-editor">
      <div className="editor-header">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter title..."
          className="title-input"
        />
        
        {onStatusChange && content?.status && (
          <div className="status-selector">
            <select
              value={content.status}
              onChange={(e) => onStatusChange(e.target.value as ContentStatus)}
            >
              <option value="draft">Draft</option>
              <option value="in_review">In Review</option>
              <option value="approved">Approved</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        )}
      </div>

      <div className="editor-toolbar">
        {formatTools.map(tool => (
          <button
            key={tool.name}
            onClick={tool.action}
            className={`toolbar-button ${tool.isActive ? 'active' : ''}`}
            title={tool.name}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      <div {...getRootProps()} className={`editor-container ${isDragActive ? 'drag-active' : ''}`}>
        <input {...getInputProps()} />
        <EditorContent editor={editor} />
        {isDragActive && (
          <div className="drop-overlay">Drop images here...</div>
        )}
      </div>

      <textarea
        value={excerpt}
        onChange={(e) => setExcerpt(e.target.value)}
        placeholder="Enter excerpt..."
        className="excerpt-input"
        rows={3}
      />

      <div className="tags-section">
        <h3>Tags</h3>
        <div className="tags-list">
          {tags.map(tag => (
            <span key={tag} className="tag">
              {tag}
              <button onClick={() => handleTagRemove(tag)}>×</button>
            </span>
          ))}
        </div>
        <input
          type="text"
          placeholder="Add tag..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleTagAdd(e.currentTarget.value);
              e.currentTarget.value = '';
            }
          }}
        />
      </div>

      <div className="seo-section">
        <h3>SEO Settings</h3>
        <input
          type="text"
          value={seo.metaTitle || ''}
          onChange={(e) => setSeo({ ...seo, metaTitle: e.target.value })}
          placeholder="Meta title (max 60 chars)"
          maxLength={60}
        />
        <textarea
          value={seo.metaDescription || ''}
          onChange={(e) => setSeo({ ...seo, metaDescription: e.target.value })}
          placeholder="Meta description (max 160 chars)"
          maxLength={160}
          rows={2}
        />
        <input
          type="text"
          value={seo.keywords?.join(', ') || ''}
          onChange={(e) => setSeo({ ...seo, keywords: e.target.value.split(',').map(k => k.trim()) })}
          placeholder="Keywords (comma separated)"
        />
      </div>

      <div className="editor-actions">
        <button onClick={onCancel} className="btn-cancel">Cancel</button>
        <button onClick={handleSave} className="btn-save">Save</button>
      </div>
    </div>
  );
};