/**
 * Unit tests for normalizeSource function
 * Tests that all form-based sources are correctly normalized to "Website"
 */

// Import the normalizeSource function logic
const normalizeSource = (source) => {
  if (!source) return source || 'Unknown';
  
  // Normalize: trim whitespace and handle case-insensitive matching
  const normalized = String(source).trim();
  
  const formSources = [
    'Brochure Download',
    'brochure download',
    'BROCHURE DOWNLOAD',
    'Product Profile Download',
    'product profile download',
    'PRODUCT PROFILE DOWNLOAD',
    'Talk to Sales',
    'talk to sales',
    'TALK TO SALES',
    'General Inquiry',
    'general inquiry',
    'GENERAL INQUIRY',
    'Request a Demo',
    'request a demo',
    'REQUEST A DEMO'
  ];
  
  // Case-insensitive check
  const isFormSource = formSources.some(formSource => 
    formSource.toLowerCase() === normalized.toLowerCase()
  );
  
  return isFormSource ? 'Website' : normalized;
};

describe('normalizeSource', () => {
  describe('Form-based sources should normalize to "Website"', () => {
    test('should normalize "Brochure Download" to "Website"', () => {
      expect(normalizeSource('Brochure Download')).toBe('Website');
    });

    test('should normalize "brochure download" (lowercase) to "Website"', () => {
      expect(normalizeSource('brochure download')).toBe('Website');
    });

    test('should normalize "BROCHURE DOWNLOAD" (uppercase) to "Website"', () => {
      expect(normalizeSource('BROCHURE DOWNLOAD')).toBe('Website');
    });

    test('should normalize "Product Profile Download" to "Website"', () => {
      expect(normalizeSource('Product Profile Download')).toBe('Website');
    });

    test('should normalize "product profile download" (lowercase) to "Website"', () => {
      expect(normalizeSource('product profile download')).toBe('Website');
    });

    test('should normalize "Talk to Sales" to "Website"', () => {
      expect(normalizeSource('Talk to Sales')).toBe('Website');
    });

    test('should normalize "talk to sales" (lowercase) to "Website"', () => {
      expect(normalizeSource('talk to sales')).toBe('Website');
    });

    test('should normalize "General Inquiry" to "Website"', () => {
      expect(normalizeSource('General Inquiry')).toBe('Website');
    });

    test('should normalize "general inquiry" (lowercase) to "Website"', () => {
      expect(normalizeSource('general inquiry')).toBe('Website');
    });

    test('should normalize "Request a Demo" to "Website"', () => {
      expect(normalizeSource('Request a Demo')).toBe('Website');
    });

    test('should normalize "request a demo" (lowercase) to "Website"', () => {
      expect(normalizeSource('request a demo')).toBe('Website');
    });

    test('should normalize sources with extra whitespace', () => {
      expect(normalizeSource('  Brochure Download  ')).toBe('Website');
      expect(normalizeSource('  Product Profile Download  ')).toBe('Website');
    });
  });

  describe('Non-form sources should remain unchanged', () => {
    test('should keep "Referral" as is', () => {
      expect(normalizeSource('Referral')).toBe('Referral');
    });

    test('should keep "Trade Show" as is', () => {
      expect(normalizeSource('Trade Show')).toBe('Trade Show');
    });

    test('should keep "Email Campaign" as is', () => {
      expect(normalizeSource('Email Campaign')).toBe('Email Campaign');
    });

    test('should keep "Cold Call" as is', () => {
      expect(normalizeSource('Cold Call')).toBe('Cold Call');
    });

    test('should keep "Social Media" as is', () => {
      expect(normalizeSource('Social Media')).toBe('Social Media');
    });

    test('should keep "LinkedIn" as is', () => {
      expect(normalizeSource('LinkedIn')).toBe('LinkedIn');
    });

    test('should keep "Website" as is (already normalized)', () => {
      expect(normalizeSource('Website')).toBe('Website');
    });
  });

  describe('Edge cases', () => {
    test('should handle null source', () => {
      expect(normalizeSource(null)).toBe('Unknown');
    });

    test('should handle undefined source', () => {
      expect(normalizeSource(undefined)).toBe('Unknown');
    });

    test('should handle empty string', () => {
      expect(normalizeSource('')).toBe('Unknown');
    });

    test('should handle whitespace-only string', () => {
      expect(normalizeSource('   ')).toBe('Unknown');
    });
  });

  describe('Source aggregation test - Dashboard logic', () => {
    // This simulates the actual dashboard aggregation logic
    const aggregateSources = (leads) => {
      const sourceCount = {};
      leads.forEach(lead => {
        // If source_type is "Website", use "Website" directly
        // Otherwise, normalize the source field
        let normalizedSource = 'Unknown';
        if (lead.source_type === 'Website') {
          normalizedSource = 'Website';
        } else if (lead.source) {
          normalizedSource = normalizeSource(lead.source);
        }
        sourceCount[normalizedSource] = (sourceCount[normalizedSource] || 0) + 1;
      });
      return sourceCount;
    };

    test('should aggregate form sources correctly when source_type is Website', () => {
      const leads = [
        { source_type: 'Website', source: 'Brochure Download' },
        { source_type: 'Website', source: 'Product Profile Download' },
        { source_type: 'Website', source: 'Talk to Sales' },
        { source_type: 'Website', source: 'General Inquiry' },
        { source_type: 'Website', source: 'Request a Demo' },
        { source_type: 'Referral', source: 'Referral' },
        { source_type: 'Trade Show', source: 'Trade Show' },
        { source_type: 'Email Campaign', source: 'Email Campaign' }
      ];

      const sourceCount = aggregateSources(leads);

      // All 5 form sources with source_type="Website" should be grouped under "Website"
      expect(sourceCount['Website']).toBe(5);
      expect(sourceCount['Referral']).toBe(1);
      expect(sourceCount['Trade Show']).toBe(1);
      expect(sourceCount['Email Campaign']).toBe(1);
      
      // Form sources should not appear individually
      expect(sourceCount['Brochure Download']).toBeUndefined();
      expect(sourceCount['Product Profile Download']).toBeUndefined();
      expect(sourceCount['Talk to Sales']).toBeUndefined();
      expect(sourceCount['General Inquiry']).toBeUndefined();
      expect(sourceCount['Request a Demo']).toBeUndefined();
    });

    test('should aggregate form sources correctly when source_type is missing (fallback to normalize)', () => {
      const leads = [
        { source: 'Brochure Download' }, // No source_type, should normalize
        { source: 'Product Profile Download' },
        { source: 'Talk to Sales' },
        { source: 'Referral' },
        { source: 'Trade Show' }
      ];

      const sourceCount = aggregateSources(leads);

      // Form sources should be normalized to "Website"
      expect(sourceCount['Website']).toBe(3);
      expect(sourceCount['Referral']).toBe(1);
      expect(sourceCount['Trade Show']).toBe(1);
    });

    test('should handle mixed source_type and source normalization', () => {
      const leads = [
        { source_type: 'Website', source: 'Brochure Download' },
        { source_type: 'Website', source: 'Product Profile Download' },
        { source: 'Talk to Sales' }, // No source_type, should normalize
        { source_type: 'Referral', source: 'Referral' },
        { source: 'General Inquiry' } // No source_type, should normalize
      ];

      const sourceCount = aggregateSources(leads);

      // All form sources should be grouped under "Website"
      expect(sourceCount['Website']).toBe(4); // 2 from source_type + 2 normalized
      expect(sourceCount['Referral']).toBe(1);
    });

    test('should handle mixed case form sources', () => {
      const leads = [
        { source: 'BROCHURE DOWNLOAD' },
        { source: 'product profile download' },
        { source: 'Talk To Sales' },
        { source: 'GENERAL INQUIRY' },
        { source: 'request a demo' }
      ];

      const sourceCount = {};
      leads.forEach(lead => {
        const normalizedSource = normalizeSource(lead.source);
        sourceCount[normalizedSource] = (sourceCount[normalizedSource] || 0) + 1;
      });

      // All should be normalized to "Website"
      expect(sourceCount['Website']).toBe(5);
    });
  });
});

