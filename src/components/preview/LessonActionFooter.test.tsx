import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { LessonActionFooter } from './LessonActionFooter';
import { downloadService } from '../../services/downloadService';

// Mock download service
vi.mock('../../services/downloadService', () => ({
  downloadService: {
    downloadDocx: vi.fn().mockResolvedValue(undefined),
    downloadPdf: vi.fn().mockResolvedValue(undefined),
  },
}));

const mockPlan: any = {
  title: 'Test Plan',
  grade: 'Grade 1',
  duration: 45,
  procedures: []
};

describe("LessonActionFooter", () => {
  it("renders all buttons", () => {
    render(<LessonActionFooter plan={mockPlan} />);
    expect(screen.getByText('Like')).toBeInTheDocument();
    expect(screen.getByText('Bookmark')).toBeInTheDocument();
    expect(screen.getByText('Download')).toBeInTheDocument();
  });

  it("toggles like and bookmark state", () => {
    render(<LessonActionFooter plan={mockPlan} />);
    
    const likeBtn = screen.getByText('Like').closest('button');
    fireEvent.click(likeBtn!);
    expect(likeBtn).toHaveClass('text-red-500');

    const bookmarkBtn = screen.getByText('Bookmark').closest('button');
    fireEvent.click(bookmarkBtn!);
    expect(bookmarkBtn).toHaveClass('text-indigo-500');
  });

  it("opens download menu, then preview modal, then confirms download", async () => {
    render(<LessonActionFooter plan={mockPlan} />);
    
    // Open menu
    fireEvent.click(screen.getByText('Download'));
    expect(screen.getByText('Word (.docx)')).toBeInTheDocument();

    // Click Word -> Opens Modal
    fireEvent.click(screen.getByText('Word (.docx)'));
    
    // Check Modal
    expect(screen.getByText('Word Document Preview')).toBeInTheDocument();
    
    // Confirm Download
    fireEvent.click(screen.getByText('Confirm Download'));
    
    expect(downloadService.downloadDocx).toHaveBeenCalledWith(mockPlan);
  });
});
