'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Tag as TagIcon, Plus, X } from 'lucide-react';
import { apiGet, apiPatch, apiPost, apiDelete } from '@/utils/api';
import toast from 'react-hot-toast';

export default function Newsletter(){
  const [subs, setSubs] = useState([]);
  const [tags, setTags] = useState([]);
  const [subscriberTags, setSubscriberTags] = useState({}); // {subscriberId: [tags]}
  const [showTagModal, setShowTagModal] = useState(false);
  const [selectedSubscriber, setSelectedSubscriber] = useState(null);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#1E73FF');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [subscribers, allTags] = await Promise.all([
        apiGet('/newsletter'),
        apiGet('/tags?entity_type=newsletter')
      ]);
      setSubs(subscribers);
      setTags(allTags);
      
      // Load tags for each subscriber
      const tagsMap = {};
      for (const sub of subscribers) {
        try {
          const subTags = await apiGet(`/tags/entity/newsletter/${sub.id}`);
          tagsMap[sub.id] = subTags;
        } catch (e) {
          tagsMap[sub.id] = [];
        }
      }
      setSubscriberTags(tagsMap);
    } catch (error) {
      toast.error('Failed to load newsletter data');
      console.error(error);
    }
  }

  async function toggle(id) {
    try {
      await apiPatch(`/newsletter/${id}`);
      await loadData();
      toast.success('Status updated');
    } catch (error) {
      toast.error('Failed to update status');
    }
  }

  async function createTag() {
    if (!newTagName.trim()) {
      toast.error('Tag name is required');
      return;
    }

    try {
      await apiPost('/tags', {
        name: newTagName,
        color: newTagColor,
        entity_type: 'newsletter'
      });
      toast.success('Tag created');
      setNewTagName('');
      setNewTagColor('#1E73FF');
      await loadData();
    } catch (error) {
      toast.error('Failed to create tag');
      console.error(error);
    }
  }

  async function addTagToSubscriber(subscriberId, tagId) {
    try {
      // Ensure API URL has protocol
      const apiUrl = process.env.NEXT_PUBLIC_API || 'http://localhost:8002';
      const normalizedApiUrl = apiUrl.startsWith('http://') || apiUrl.startsWith('https://') 
        ? apiUrl 
        : `http://${apiUrl}`;
      
      const response = await fetch(`${normalizedApiUrl}/tags/entity/newsletter/${subscriberId}?tag_id=${tagId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to add tag');
      toast.success('Tag added');
      await loadData();
    } catch (error) {
      toast.error('Failed to add tag');
      console.error(error);
    }
  }

  async function removeTagFromSubscriber(subscriberId, tagId) {
    try {
      await apiDelete(`/tags/entity/newsletter/${subscriberId}/${tagId}`);
      toast.success('Tag removed');
      await loadData();
    } catch (error) {
      toast.error('Failed to remove tag');
      console.error(error);
    }
  }

  return (
    <div className="page">
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Newsletter Subscribers</h1>
          <p style={{ color: '#666', fontSize: '14px' }}>Manage subscribers and tags</p>
        </div>
        <button
          className="btn primary"
          onClick={() => setShowTagModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={16} />
          Create Tag
        </button>
      </div>

      <motion.div 
        className="card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Subscribed On</th>
              <th>Status</th>
              <th>Tags</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subs.map(s => (
              <tr key={s.id}>
                <td>{s.email}</td>
                <td>{s.date}</td>
                <td>
                  {s.active ? (
                    <span className="badge success">Active</span>
                  ) : (
                    <span className="badge danger">Inactive</span>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {(subscriberTags[s.id] || []).map(tag => (
                      <span
                        key={tag.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 500,
                          background: `${tag.color}20`,
                          color: tag.color,
                          border: `1px solid ${tag.color}40`
                        }}
                      >
                        {tag.name}
                        <button
                          onClick={() => removeTagFromSubscriber(s.id, tag.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    <button
                      onClick={() => {
                        setSelectedSubscriber(s.id);
                        setShowTagModal(true);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        background: 'var(--gray-100)',
                        border: '1px solid var(--gray-200)',
                        cursor: 'pointer',
                        color: '#666'
                      }}
                    >
                      <Plus size={12} />
                      Add Tag
                    </button>
                  </div>
                </td>
                <td>
                  <button className="btn secondary" onClick={() => toggle(s.id)}>
                    Toggle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      {/* Tag Modal */}
      {showTagModal && (
        <div className="modal-overlay" onClick={() => {
          setShowTagModal(false);
          setSelectedSubscriber(null);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedSubscriber ? 'Add Tag to Subscriber' : 'Create New Tag'}</h3>
              <button className="modal-close" onClick={() => {
                setShowTagModal(false);
                setSelectedSubscriber(null);
              }}>×</button>
            </div>

            {selectedSubscriber ? (
              <div>
                <div className="form-group">
                  <label>Select Tag</label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        addTagToSubscriber(selectedSubscriber, parseInt(e.target.value));
                        setShowTagModal(false);
                        setSelectedSubscriber(null);
                      }
                    }}
                    style={{ marginBottom: '16px' }}
                  >
                    <option value="">Choose a tag...</option>
                    {tags
                      .filter(tag => !(subscriberTags[selectedSubscriber] || []).some(st => st.id === tag.id))
                      .map(tag => (
                        <option key={tag.id} value={tag.id}>
                          {tag.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--gray-200)' }}>
                  <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>Or create a new tag:</p>
                  <div className="form-group">
                    <label>Tag Name</label>
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="Enter tag name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Tag Color</label>
                    <input
                      type="color"
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                    />
                  </div>
                  <button
                    className="btn primary"
                    onClick={async () => {
                      await createTag();
                      if (selectedSubscriber && newTagName) {
                        // Find the newly created tag and add it
                        const updatedTags = await apiGet('/tags?entity_type=newsletter');
                        const newTag = updatedTags.find(t => t.name === newTagName);
                        if (newTag) {
                          await addTagToSubscriber(selectedSubscriber, newTag.id);
                        }
                      }
                      setShowTagModal(false);
                      setSelectedSubscriber(null);
                    }}
                    style={{ marginTop: '12px' }}
                  >
                    Create & Add Tag
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="form-group">
                  <label>Tag Name</label>
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Enter tag name"
                  />
                </div>
                <div className="form-group">
                  <label>Tag Color</label>
                  <input
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                  <button className="btn secondary" onClick={() => {
                    setShowTagModal(false);
                    setNewTagName('');
                  }}>
                    Cancel
                  </button>
                  <button className="btn primary" onClick={createTag}>
                    Create Tag
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
