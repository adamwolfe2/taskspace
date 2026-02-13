-- Web Vitals Performance Metrics Table
-- Stores Core Web Vitals (LCP, CLS, FCP, TTFB, INP) for performance monitoring

CREATE TABLE IF NOT EXISTS web_vitals_metrics (
  id SERIAL PRIMARY KEY,
  metric_name VARCHAR(50) NOT NULL,
  metric_value NUMERIC(10, 2) NOT NULL,
  rating VARCHAR(20) NOT NULL CHECK (rating IN ('good', 'needs-improvement', 'poor')),
  metric_id VARCHAR(255) NOT NULL UNIQUE, -- Unique identifier from web-vitals library
  navigation_type VARCHAR(50),
  url TEXT NOT NULL,
  user_agent TEXT,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),

  -- Indexes for performance analysis queries
  INDEX idx_web_vitals_metric_name (metric_name),
  INDEX idx_web_vitals_timestamp (timestamp),
  INDEX idx_web_vitals_rating (rating),
  INDEX idx_web_vitals_url (url)
);

-- Add comment for documentation
COMMENT ON TABLE web_vitals_metrics IS 'Stores Core Web Vitals metrics for real user monitoring and performance analysis';
COMMENT ON COLUMN web_vitals_metrics.metric_name IS 'Web Vital metric name (LCP, CLS, FCP, TTFB, INP)';
COMMENT ON COLUMN web_vitals_metrics.metric_value IS 'Metric value in milliseconds (or unitless for CLS)';
COMMENT ON COLUMN web_vitals_metrics.rating IS 'Performance rating based on Google thresholds';
COMMENT ON COLUMN web_vitals_metrics.metric_id IS 'Unique identifier from web-vitals library to prevent duplicates';
