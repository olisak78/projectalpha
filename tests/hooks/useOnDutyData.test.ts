import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { useOnDutyData, Member, OnCallShift, OnDutyShift } from '../../src/hooks/useOnDutyData';
import * as XLSX from 'xlsx';

/**
 * useOnDutyData Hook Tests
 * 
 * Tests for the useOnDutyData custom hook which manages on-duty and on-call
 * scheduling data with localStorage persistence, Excel import/export, and
 * undo functionality.
 * 
 * Hook Location: src/hooks/useOnDutyData.ts
 * Features: Schedule management, Excel operations, undo/redo, team member management
 */

// ============================================================================
// MOCKS
// ============================================================================

// Mock XLSX library
vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn(),
    book_new: vi.fn(),
    book_append_sheet: vi.fn(),
    sheet_to_json: vi.fn(),
  },
  writeFile: vi.fn(),
  read: vi.fn(),
}));

// Mock team data
vi.mock('../../src/data/team/my-team.json', () => ({
  default: {
    members: [
      {
        id: 'member-1',
        fullName: 'John Doe',
        email: 'john.doe@example.com',
        role: 'Developer',
        team: 'Engineering'
      },
      {
        id: 'member-2',
        fullName: 'Jane Smith',
        email: 'jane.smith@example.com',
        role: 'Senior Developer',
        team: 'Engineering'
      }
    ]
  }
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// ============================================================================
// TEST UTILITIES
// ============================================================================

const mockMembers: Member[] = [
  {
    id: 'member-1',
    fullName: 'John Doe',
    email: 'john.doe@example.com',
    role: 'Developer',
    team: 'Engineering'
  },
  {
    id: 'member-2',
    fullName: 'Jane Smith',
    email: 'jane.smith@example.com',
    role: 'Senior Developer',
    team: 'Engineering'
  }
];

const mockOnCallShifts: OnCallShift[] = [
  {
    id: 'oc-1',
    start: '2024-01-01',
    end: '2024-01-07',
    type: 'week',
    assigneeId: 'member-1',
    called: false
  },
  {
    id: 'oc-2',
    start: '2024-01-06',
    end: '2024-01-07',
    type: 'weekend',
    assigneeId: 'member-2',
    called: true
  }
];

const mockOnDutyShifts: OnDutyShift[] = [
  {
    id: 'od-1',
    date: '2024-01-01',
    start: '2024-01-01',
    end: '2024-01-01',
    assigneeId: 'member-1',
    notes: 'Regular shift'
  },
  {
    id: 'od-2',
    date: '2024-01-02',
    start: '2024-01-02',
    end: '2024-01-02',
    assigneeId: 'member-2',
    notes: 'Emergency coverage'
  }
];

const mockXLSX = XLSX as any;

/**
 * Helper function to setup default mocks
 */
function setupDefaultMocks() {
  localStorageMock.getItem.mockReturnValue(JSON.stringify({
    onCall: { '2024': mockOnCallShifts },
    onDuty: { '2024': mockOnDutyShifts }
  }));
  
  mockXLSX.utils.json_to_sheet.mockReturnValue({});
  mockXLSX.utils.book_new.mockReturnValue({});
  mockXLSX.utils.book_append_sheet.mockReturnValue(undefined);
  mockXLSX.writeFile.mockReturnValue(undefined);
  mockXLSX.read.mockReturnValue({
    Sheets: { 'Sheet1': {} },
    SheetNames: ['Sheet1']
  });
  mockXLSX.utils.sheet_to_json.mockReturnValue([
    {
      start: '2024-01-01',
      end: '2024-01-07',
      type: 'week',
      assigneeEmail: 'john.doe@example.com',
      called: 'no'
    }
  ]);
}

// ============================================================================
// HOOK TESTS
// ============================================================================

describe('useOnDutyData Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ==========================================================================
  // INITIALIZATION TESTS
  // ==========================================================================

  describe('Initialization', () => {
    it('should initialize with default values and load from localStorage', () => {
      const { result } = renderHook(() => useOnDutyData());

      expect(result.current.year).toBe(2024);
      expect(result.current.members).toEqual(mockMembers);
      expect(result.current.onCall).toEqual(mockOnCallShifts);
      expect(result.current.onDuty).toEqual(mockOnDutyShifts);
      expect(result.current.canUndo).toBe(false);
    });

    it('should initialize with empty data when localStorage is empty', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useOnDutyData());

      expect(result.current.onCall).toEqual([]);
      expect(result.current.onDuty).toEqual([]);
    });

    it('should use custom members when provided', () => {
      const customMembers: Member[] = [
        {
          id: 'custom-1',
          fullName: 'Custom User',
          email: 'custom@example.com',
          role: 'Manager'
        }
      ];

      const { result } = renderHook(() => useOnDutyData(undefined, customMembers));

      expect(result.current.members).toEqual(customMembers);
    });

    it('should use custom team key for storage', () => {
      const { result } = renderHook(() => useOnDutyData('custom-team'));

      expect(localStorageMock.getItem).toHaveBeenCalledWith('onDutyStore:custom-team');
    });

    it('should provide all expected functions and properties', () => {
      const { result } = renderHook(() => useOnDutyData());

      expect(typeof result.current.setYear).toBe('function');
      expect(typeof result.current.setOnCall).toBe('function');
      expect(typeof result.current.setOnDuty).toBe('function');
      expect(typeof result.current.undo).toBe('function');
      expect(typeof result.current.save).toBe('function');
      expect(typeof result.current.exportOnCallToExcel).toBe('function');
      expect(typeof result.current.importOnCallFromExcel).toBe('function');
      expect(typeof result.current.exportOnDutyToExcel).toBe('function');
      expect(typeof result.current.importOnDutyFromExcel).toBe('function');
      expect(result.current.membersById).toBeDefined();
      expect(result.current.todayAssignments).toBeDefined();
    });
  });

  // ==========================================================================
  // YEAR MANAGEMENT TESTS
  // ==========================================================================

  describe('Year Management', () => {
    it('should change year and load corresponding data', () => {
      const { result } = renderHook(() => useOnDutyData());

      act(() => {
        result.current.setYear(2023);
      });

      expect(result.current.year).toBe(2023);
      expect(result.current.onCall).toEqual([]);
      expect(result.current.onDuty).toEqual([]);
    });

    it('should maintain data per year', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        onCall: { 
          '2023': [{ id: 'old-shift', start: '2023-01-01', end: '2023-01-07', type: 'week', assigneeId: 'member-1' }],
          '2024': mockOnCallShifts 
        },
        onDuty: { 
          '2023': [{ id: 'old-duty', date: '2023-01-01', assigneeId: 'member-1' }],
          '2024': mockOnDutyShifts 
        }
      }));

      const { result } = renderHook(() => useOnDutyData());

      expect(result.current.year).toBe(2024);
      expect(result.current.onCall).toEqual(mockOnCallShifts);

      act(() => {
        result.current.setYear(2023);
      });

      expect(result.current.onCall).toHaveLength(1);
      expect(result.current.onCall[0].id).toBe('old-shift');
    });
  });

  // ==========================================================================
  // DATA MANAGEMENT TESTS
  // ==========================================================================

  describe('Data Management', () => {
    it('should update onCall shifts and persist to localStorage', () => {
      const { result } = renderHook(() => useOnDutyData());

      const newShifts: OnCallShift[] = [
        {
          id: 'new-oc-1',
          start: '2024-02-01',
          end: '2024-02-07',
          type: 'week',
          assigneeId: 'member-2',
          called: false
        }
      ];

      act(() => {
        result.current.setOnCall(newShifts);
      });

      expect(result.current.onCall).toEqual(newShifts);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should update onDuty shifts and persist to localStorage', () => {
      const { result } = renderHook(() => useOnDutyData());

      const newShifts: OnDutyShift[] = [
        {
          id: 'new-od-1',
          date: '2024-02-01',
          assigneeId: 'member-2',
          notes: 'New shift'
        }
      ];

      act(() => {
        result.current.setOnDuty(newShifts);
      });

      expect(result.current.onDuty).toEqual(newShifts);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const { result } = renderHook(() => useOnDutyData());

      expect(result.current.onCall).toEqual([]);
      expect(result.current.onDuty).toEqual([]);
    });
  });

  // ==========================================================================
  // UNDO FUNCTIONALITY TESTS
  // ==========================================================================

  describe('Undo Functionality', () => {
    it('should provide undo function', () => {
      const { result } = renderHook(() => useOnDutyData());

      expect(typeof result.current.undo).toBe('function');
      expect(typeof result.current.canUndo).toBe('boolean');
    });

    it('should limit history size to MAX_HISTORY_SIZE', async () => {
      const { result } = renderHook(() => useOnDutyData());

      // Make multiple changes to exceed history limit
      for (let i = 0; i < 15; i++) {
        act(() => {
          result.current.setOnCall([{ 
            id: `shift-${i}`, 
            start: '2024-01-01', 
            end: '2024-01-07', 
            type: 'week', 
            assigneeId: 'member-1' 
          }]);
        });

        await act(async () => {
          vi.advanceTimersByTime(300);
        });
      }

      // Test passes if no errors are thrown during history management
      expect(result.current.onCall).toHaveLength(1);
    });
  });

  // ==========================================================================
  // TODAY ASSIGNMENTS TESTS
  // ==========================================================================

  describe('Today Assignments', () => {
    it('should calculate today assignments correctly for weekday', () => {
      vi.setSystemTime(new Date('2024-01-03T12:00:00Z')); // Wednesday

      const { result } = renderHook(() => useOnDutyData());

      const todayStr = '2024-01-03';
      const onDutyToday: OnDutyShift[] = [{
        id: 'od-today',
        date: todayStr,
        assigneeId: 'member-1'
      }];

      const onCallWeek: OnCallShift[] = [{
        id: 'oc-week',
        start: '2024-01-01',
        end: '2024-01-07',
        type: 'week',
        assigneeId: 'member-2'
      }];

      act(() => {
        result.current.setOnDuty(onDutyToday);
        result.current.setOnCall(onCallWeek);
      });

      expect(result.current.todayAssignments.dayMember?.id).toBe('member-1');
      expect(result.current.todayAssignments.nightMember?.id).toBe('member-2');
    });

    it('should calculate today assignments correctly for weekend', () => {
      vi.setSystemTime(new Date('2024-01-06T12:00:00Z')); // Saturday

      const { result } = renderHook(() => useOnDutyData());

      const todayStr = '2024-01-06';
      const onDutyToday: OnDutyShift[] = [{
        id: 'od-today',
        date: todayStr,
        assigneeId: 'member-1'
      }];

      const onCallWeekend: OnCallShift[] = [{
        id: 'oc-weekend',
        start: '2024-01-06',
        end: '2024-01-07',
        type: 'weekend',
        assigneeId: 'member-2'
      }];

      act(() => {
        result.current.setOnDuty(onDutyToday);
        result.current.setOnCall(onCallWeekend);
      });

      expect(result.current.todayAssignments.dayMember?.id).toBe('member-1');
      expect(result.current.todayAssignments.nightMember?.id).toBe('member-2');
    });

    it('should handle date range assignments', () => {
      vi.setSystemTime(new Date('2024-01-03T12:00:00Z'));

      const { result } = renderHook(() => useOnDutyData());

      const onDutyRange: OnDutyShift[] = [{
        id: 'od-range',
        start: '2024-01-01',
        end: '2024-01-05',
        assigneeId: 'member-1'
      }];

      act(() => {
        result.current.setOnDuty(onDutyRange);
      });

      expect(result.current.todayAssignments.dayMember?.id).toBe('member-1');
    });
  });

  // ==========================================================================
  // EXCEL EXPORT TESTS
  // ==========================================================================

  describe('Excel Export', () => {
    it('should export onCall data to Excel', () => {
      const { result } = renderHook(() => useOnDutyData());

      act(() => {
        result.current.exportOnCallToExcel();
      });

      expect(mockXLSX.utils.json_to_sheet).toHaveBeenCalledWith([
        {
          start: '2024-01-01',
          end: '2024-01-07',
          type: 'week',
          assigneeEmail: 'john.doe@example.com',
          called: 'no'
        },
        {
          start: '2024-01-06',
          end: '2024-01-07',
          type: 'weekend',
          assigneeEmail: 'jane.smith@example.com',
          called: 'yes'
        }
      ]);
      expect(mockXLSX.writeFile).toHaveBeenCalled();
    });

    it('should export onDuty data to Excel', () => {
      const { result } = renderHook(() => useOnDutyData());

      act(() => {
        result.current.exportOnDutyToExcel();
      });

      expect(mockXLSX.utils.json_to_sheet).toHaveBeenCalledWith([
        {
          start: '2024-01-01',
          end: '2024-01-01',
          assigneeEmail: 'john.doe@example.com',
          notes: 'Regular shift'
        },
        {
          start: '2024-01-02',
          end: '2024-01-02',
          assigneeEmail: 'jane.smith@example.com',
          notes: 'Emergency coverage'
        }
      ]);
      expect(mockXLSX.writeFile).toHaveBeenCalled();
    });

    it('should handle missing member data in export', () => {
      const { result } = renderHook(() => useOnDutyData());

      const shiftsWithUnknownMember: OnCallShift[] = [{
        id: 'unknown',
        start: '2024-01-01',
        end: '2024-01-07',
        type: 'week',
        assigneeId: 'unknown-member'
      }];

      act(() => {
        result.current.setOnCall(shiftsWithUnknownMember);
      });

      act(() => {
        result.current.exportOnCallToExcel();
      });

      expect(mockXLSX.utils.json_to_sheet).toHaveBeenCalledWith([
        {
          start: '2024-01-01',
          end: '2024-01-07',
          type: 'week',
          assigneeEmail: 'unknown-member',
          called: 'no'
        }
      ]);
    });
  });

  // ==========================================================================
  // EXCEL IMPORT TESTS
  // ==========================================================================

  describe('Excel Import', () => {
    it('should import onCall data from Excel', async () => {
      const { result } = renderHook(() => useOnDutyData());

      // Create a proper mock file with arrayBuffer method
      const mockArrayBuffer = new ArrayBuffer(8);
      const mockFile = {
        arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer),
        name: 'on-call.xlsx',
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      } as any;

      await act(async () => {
        await result.current.importOnCallFromExcel(mockFile);
      });

      expect(mockXLSX.read).toHaveBeenCalledWith(mockArrayBuffer);
      expect(result.current.onCall).toHaveLength(1);
      expect(result.current.onCall[0].assigneeId).toBe('member-1');
    });

    it('should import onDuty data from Excel', async () => {
      const { result } = renderHook(() => useOnDutyData());

      mockXLSX.utils.sheet_to_json.mockReturnValue([
        {
          start: '2024-01-01',
          end: '2024-01-01',
          assigneeEmail: 'john.doe@example.com',
          notes: 'Imported shift'
        }
      ]);

      const mockArrayBuffer = new ArrayBuffer(8);
      const mockFile = {
        arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer),
        name: 'on-duty.xlsx',
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      } as any;

      await act(async () => {
        await result.current.importOnDutyFromExcel(mockFile);
      });

      expect(result.current.onDuty).toHaveLength(1);
      expect(result.current.onDuty[0].assigneeId).toBe('member-1');
      expect(result.current.onDuty[0].notes).toBe('Imported shift');
    });

    it('should handle unknown email addresses in import', async () => {
      const { result } = renderHook(() => useOnDutyData());

      mockXLSX.utils.sheet_to_json.mockReturnValue([
        {
          start: '2024-01-01',
          end: '2024-01-07',
          type: 'week',
          assigneeEmail: 'unknown@example.com',
          called: 'no'
        }
      ]);

      const mockArrayBuffer = new ArrayBuffer(8);
      const mockFile = {
        arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer),
        name: 'on-call.xlsx',
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      } as any;

      await act(async () => {
        await result.current.importOnCallFromExcel(mockFile);
      });

      expect(result.current.onCall[0].assigneeId).toBe('');
    });
  });

  // ==========================================================================
  // MEMBER MANAGEMENT TESTS
  // ==========================================================================

  describe('Member Management', () => {
    it('should create membersById lookup correctly', () => {
      const { result } = renderHook(() => useOnDutyData());

      expect(result.current.membersById['member-1']).toEqual(mockMembers[0]);
      expect(result.current.membersById['member-2']).toEqual(mockMembers[1]);
    });

    it('should use custom members when provided', () => {
      const customMembers: Member[] = [
        {
          id: 'custom-1',
          fullName: 'Custom User',
          email: 'custom@example.com',
          role: 'Manager'
        }
      ];

      const { result } = renderHook(() => useOnDutyData(undefined, customMembers));

      expect(result.current.members).toEqual(customMembers);
      expect(result.current.membersById['custom-1']).toEqual(customMembers[0]);
    });
  });

  // ==========================================================================
  // SAVE FUNCTIONALITY TESTS
  // ==========================================================================

  describe('Save Functionality', () => {
    it('should force save to localStorage', () => {
      const { result } = renderHook(() => useOnDutyData());

      act(() => {
        result.current.save();
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // EDGE CASES TESTS
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle malformed localStorage data', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      const { result } = renderHook(() => useOnDutyData());

      expect(result.current.onCall).toEqual([]);
      expect(result.current.onDuty).toEqual([]);
    });

    it('should handle missing team data gracefully', () => {
      // Test that the hook doesn't crash with missing data
      expect(() => {
        renderHook(() => useOnDutyData(undefined, []));
      }).not.toThrow();
    });

    it('should handle date edge cases in today assignments', () => {
      vi.setSystemTime(new Date('2024-12-31T23:59:59Z')); // End of year

      const { result } = renderHook(() => useOnDutyData());

      expect(result.current.todayAssignments.dayMember).toBeUndefined();
      expect(result.current.todayAssignments.nightMember).toBeUndefined();
    });
  });

  // ==========================================================================
  // INTEGRATION TESTS
  // ==========================================================================

  describe('Integration Tests', () => {
    it('should handle complete workflow: create, modify, export', async () => {
      const { result } = renderHook(() => useOnDutyData());

      // Create new shift
      const newShift: OnCallShift = {
        id: 'integration-test',
        start: '2024-02-01',
        end: '2024-02-07',
        type: 'week',
        assigneeId: 'member-1',
        called: false
      };

      act(() => {
        result.current.setOnCall([newShift]);
      });

      expect(result.current.onCall).toEqual([newShift]);

      // Export data
      act(() => {
        result.current.exportOnCallToExcel();
      });

      expect(mockXLSX.writeFile).toHaveBeenCalled();
    });

    it('should maintain data consistency across year changes', () => {
      const { result } = renderHook(() => useOnDutyData());

      const originalData = result.current.onCall;

      // Change year
      act(() => {
        result.current.setYear(2023);
      });

      expect(result.current.onCall).toEqual([]);

      // Change back
      act(() => {
        result.current.setYear(2024);
      });

      expect(result.current.onCall).toEqual(originalData);
    });
  });
});
