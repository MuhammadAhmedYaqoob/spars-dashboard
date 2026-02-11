'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, MessageSquare, HelpCircle, Download, BookOpen, ArrowRight } from 'lucide-react';
import { apiGet } from '@/utils/api';
import toast from 'react-hot-toast';
import Link from 'next/link';

const formTypes = [
  { type: 'demo', label: 'Request a Demo', icon: MessageSquare, color: '#1E73FF' },
  { type: 'talk', label: 'Talk to Sales', icon: HelpCircle, color: '#28C76F' },
  { type: 'general', label: 'General Inquiry', icon: FileText, color: '#FF9F43' },
  { type: 'product-profile', label: 'Product Profile Download', icon: Download, color: '#EA5455' },
  { type: 'brochure', label: 'Brochure Download', icon: BookOpen, color: '#7367F0' },
];

export default function SubmissionsIndex(){
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const countsData = {};
        for (const form of formTypes) {
          try {
            const data = await apiGet(`/submissions/${form.type}`).catch(() => []);
            countsData[form.type] = data.length;
          } catch (error) {
            countsData[form.type] = 0;
          }
        }
        setCounts(countsData);
      } catch (error) {
        toast.error('Failed to load submission counts');
        console.error(error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="page">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Form Submissions</h1>
        <p style={{ color: '#666', fontSize: '14px' }}>View and manage form submissions by type</p>
      </div>

      <div className="grid2" style={{ gap: '20px' }}>
        {formTypes.map((form, index) => {
          const Icon = form.icon;
          const count = counts[form.type] || 0;
          return (
            <motion.div
              key={form.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link href={`/submissions/${form.type}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <motion.div
                  className="card card-hover"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{ cursor: 'pointer', height: '100%' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ 
                      width: '56px', 
                      height: '56px', 
                      borderRadius: '12px', 
                      background: `${form.color}15`, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      <Icon size={28} color={form.color} />
                    </div>
                    <div style={{ 
                      background: form.color, 
                      color: '#fff', 
                      padding: '4px 12px', 
                      borderRadius: '20px', 
                      fontSize: '14px', 
                      fontWeight: 600 
                    }}>
                      {count}
                    </div>
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px 0' }}>{form.label}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', color: form.color, fontSize: '14px', fontWeight: 500 }}>
                    View submissions <ArrowRight size={16} style={{ marginLeft: '8px' }} />
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
