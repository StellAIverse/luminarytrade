import React, { useEffect, useState } from 'react';
import { useResponsive } from '../hooks/useResponsive';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  submitBugReportStart,
  submitBugReportSuccess,
  submitBugReportFailure,
  fetchBugReportsStart,
  fetchBugReportsSuccess,
  fetchBugReportsFailure,
} from '../store/slices/bugReportSlice';
import { bugReportService } from '../services/bugReport.service';
import { BugPriority } from '../types/growth';
import { spacing } from '../styles/theme';
import OptimizedImage from './OptimizedImage';

const cardStyle: React.CSSProperties = {
  borderRadius: 16,
  border: '1px solid rgba(148, 163, 184, 0.18)',
  background: 'rgba(255,255,255,0.9)',
  boxShadow: '0 8px 32px rgba(15, 23, 42, 0.08)',
  padding: 24,
  backdropFilter: 'blur(12px)',
};

const BugReportForm: React.FC = () => {
  const { isMobile } = useResponsive();
  const dispatch = useAppDispatch();
  const { reports, totalRewards, loading, error } = useAppSelector((state) => state.bugReport);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<BugPriority>('medium');
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [submitFeedback, setSubmitFeedback] = useState('');
  const [activeTab, setActiveTab] = useState<'submit' | 'my-reports'>('submit');

  useEffect(() => {
    const fetchReports = async () => {
      try {
        dispatch(fetchBugReportsStart());
        const reportsData = await bugReportService.getBugReports();
        dispatch(fetchBugReportsSuccess(reportsData.reports));
      } catch (err: any) {
        dispatch(fetchBugReportsFailure(err.message || 'Failed to fetch bug reports'));
      }
    };

    fetchReports();
  }, [dispatch]);

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const uploadPromises = Array.from(files).map((file) =>
        bugReportService.uploadScreenshot(file)
      );
      const urls = await Promise.all(uploadPromises);
      setScreenshots((prev) => [...prev, ...urls]);
      setSubmitFeedback('Screenshots uploaded successfully!');
    } catch (err: any) {
      setSubmitFeedback(err.message || 'Failed to upload screenshots');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      setSubmitFeedback('Please fill in both title and description');
      return;
    }

    try {
      dispatch(submitBugReportStart());
      const report = await bugReportService.submitBugReport({
        title: title.trim(),
        description: description.trim(),
        priority,
        screenshots,
        browserInfo: navigator.userAgent,
        osInfo: navigator.platform,
      });
      dispatch(submitBugReportSuccess(report));
      setSubmitFeedback('Bug report submitted successfully! You may be eligible for rewards.');
      setTitle('');
      setDescription('');
      setPriority('medium');
      setScreenshots([]);
    } catch (err: any) {
      dispatch(submitBugReportFailure(err.message || 'Failed to submit bug report'));
      setSubmitFeedback(err.message || 'Failed to submit bug report');
    }
  };

  const getPriorityColor = (p: BugPriority) => {
    switch (p) {
      case 'critical':
        return '#ef4444';
      case 'high':
        return '#ea580c';
      case 'medium':
        return '#d97706';
      case 'low':
        return '#059669';
      default:
        return '#64748b';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return '#059669';
      case 'accepted':
        return '#2563eb';
      case 'under_review':
        return '#d97706';
      case 'rejected':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  if (loading && reports.length === 0) {
    return (
      <div style={{ padding: spacing.xl, textAlign: 'center' }}>
        <p>Loading bug reports...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #fef3c7 0%, #f8fafc 50%, #fee2e2 100%)',
        padding: isMobile ? spacing.md : spacing.xl,
      }}
    >
      {/* Header */}
      <div style={{ ...cardStyle, marginBottom: spacing.lg, background: 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)', color: '#fff' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: isMobile ? 28 : 36 }}>
          Bug Bounty Program
        </h1>
        <p style={{ margin: 0, opacity: 0.9 }}>
          Report bugs and earn rewards. Total rewards earned: ${totalRewards}
        </p>
      </div>

      {/* Tabs */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <button
            onClick={() => setActiveTab('submit')}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              background: activeTab === 'submit' ? '#ea580c' : '#f1f5f9',
              color: activeTab === 'submit' ? '#fff' : '#64748b',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Submit Bug Report
          </button>
          <button
            onClick={() => setActiveTab('my-reports')}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              background: activeTab === 'my-reports' ? '#ea580c' : '#f1f5f9',
              color: activeTab === 'my-reports' ? '#fff' : '#64748b',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            My Reports
          </button>
        </div>

        {activeTab === 'submit' && (
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 20 }}>
            <div>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#475569', marginBottom: 8, display: 'block' }}>
                Bug Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief description of the bug"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  fontSize: 16,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#475569', marginBottom: 8, display: 'block' }}>
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed description of the bug, steps to reproduce, expected vs actual behavior"
                rows={6}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  fontSize: 14,
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#475569', marginBottom: 8, display: 'block' }}>
                Priority Level
              </label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {(['low', 'medium', 'high', 'critical'] as BugPriority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: 10,
                      background: priority === p ? getPriorityColor(p) : '#f1f5f9',
                      color: priority === p ? '#fff' : '#64748b',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#475569', marginBottom: 8, display: 'block' }}>
                Screenshots (optional)
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleScreenshotUpload}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  border: '2px dashed rgba(148, 163, 184, 0.3)',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
              {screenshots.length > 0 && (
                <>
                  <div style={{ marginTop: 12, fontSize: 14, color: '#059669', fontWeight: 600 }}>
                    {screenshots.length} screenshot(s) uploaded
                  </div>
                  <div style={{ 
                    marginTop: 12, 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: 12 
                  }}>
                    {screenshots.map((screenshot, index) => (
                      <div key={index} style={{ position: 'relative' }}>
                        <OptimizedImage
                          src={screenshot}
                          alt={`Screenshot ${index + 1}`}
                          width={150}
                          height={100}
                          quality={70}
                          format="webp"
                          lazy={true}
                          responsive={true}
                          style={{
                            width: '100%',
                            height: '100px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            border: '1px solid rgba(148, 163, 184, 0.3)'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setScreenshots(prev => prev.filter((_, i) => i !== index));
                            setSubmitFeedback('Screenshot removed');
                          }}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            background: 'rgba(239, 68, 68, 0.9)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {submitFeedback && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: submitFeedback.includes('success') ? '#dcfce7' : '#fef3c7',
                  color: submitFeedback.includes('success') ? '#166534' : '#92400e',
                  fontWeight: 600,
                }}
              >
                {submitFeedback}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '14px 24px',
                borderRadius: 10,
                background: loading ? '#94a3b8' : '#ea580c',
                color: '#fff',
                fontWeight: 700,
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 16,
              }}
            >
              {loading ? 'Submitting...' : 'Submit Bug Report'}
            </button>
          </form>
        )}

        {activeTab === 'my-reports' && (
          <div>
            {reports.length === 0 ? (
              <p style={{ color: '#64748b' }}>No bug reports submitted yet.</p>
            ) : (
              <div style={{ display: 'grid', gap: 16 }}>
                {reports.map((report) => (
                  <div
                    key={report.id}
                    style={{
                      padding: 20,
                      background: '#f8fafc',
                      borderRadius: 12,
                      border: '1px solid rgba(148, 163, 184, 0.18)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                      <h3 style={{ margin: 0, fontSize: 18 }}>{report.title}</h3>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: 8,
                            background: `${getPriorityColor(report.priority)}20`,
                            color: getPriorityColor(report.priority),
                            fontWeight: 600,
                            fontSize: 12,
                            textTransform: 'capitalize',
                          }}
                        >
                          {report.priority}
                        </span>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: 8,
                            background: `${getStatusColor(report.status)}20`,
                            color: getStatusColor(report.status),
                            fontWeight: 600,
                            fontSize: 12,
                          }}
                        >
                          {report.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                    <p style={{ margin: '0 0 12px', color: '#475569', lineHeight: 1.6 }}>
                      {report.description}
                    </p>
                    {report.screenshots.length > 0 && (
                      <div style={{ 
                        marginBottom: 12,
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                        gap: 8 
                      }}>
                        {report.screenshots.map((screenshot, index) => (
                          <OptimizedImage
                            key={index}
                            src={screenshot}
                            alt={`Report screenshot ${index + 1}`}
                            width={120}
                            height={80}
                            quality={60}
                            format="webp"
                            lazy={true}
                            responsive={true}
                            style={{
                              width: '100%',
                              height: '80px',
                              objectFit: 'cover',
                              borderRadius: '6px',
                              border: '1px solid rgba(148, 163, 184, 0.2)',
                              cursor: 'pointer'
                            }}
                            onClick={() => window.open(screenshot, '_blank')}
                          />
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ fontSize: 13, color: '#64748b' }}>
                        Submitted {new Date(report.submittedAt).toLocaleDateString()}
                        {report.screenshots.length > 0 && ` • ${report.screenshots.length} screenshot(s)`}
                      </div>
                      {report.rewardAmount && (
                        <div style={{ fontWeight: 700, color: '#059669', fontSize: 16 }}>
                          Reward: ${report.rewardAmount}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BugReportForm;
