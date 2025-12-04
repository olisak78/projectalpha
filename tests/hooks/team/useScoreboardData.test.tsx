import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useScoreboardData } from '../../../src/hooks/team/useScoreboardData';
import type { Member as DutyMember } from '../../../src/hooks/useOnDutyData';
import type { JiraIssue } from '../../../src/types/api';

// ============================================================================
// TEST UTILITIES
// ============================================================================

const createMockMember = (overrides?: Partial<DutyMember>): DutyMember => ({
  id: 'member-123',
  fullName: 'John Doe',
  email: 'john@example.com',
  role: 'Developer',
  iuser: 'jdoe',
  avatar: '',
  team: 'team-123',
  ...overrides,
});

const createMockJiraIssue = (overrides?: Partial<any>): any => ({
  id: 'issue-123',
  key: 'PROJ-123',
  status: 'Done',
  assigneeId: 'member-123',
  summary: 'Test issue',
  ...overrides,
});

const createMockGithubStat = (overrides?: Partial<any>): any => ({
  memberId: 'member-123',
  lines: 15000,
  ...overrides,
});

const createMockOnDutyData = (overrides?: Partial<any>): any => ({
  onDuty: [],
  onCall: [],
  ...overrides,
});

const createMockTeam = (overrides?: Partial<any>): any => ({
  team: 'Team Alpha',
  ...overrides,
});

// ============================================================================
// MAIN TESTS
// ============================================================================

describe('useScoreboardData Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should return all expected properties with correct SCORE_WEIGHTS', () => {
      const members = [createMockMember()];
      const memberById = { 'member-123': members[0] };
      
      const { result } = renderHook(() =>
        useScoreboardData({
          jiraIssues: [],
          githubStats: [],
          onDutyData: createMockOnDutyData(),
          memberById,
          members,
          allTeams: [],
        })
      );

      // Verify all expected properties exist
      expect(result.current).toHaveProperty('jiraTop3');
      expect(result.current).toHaveProperty('gitTop3');
      expect(result.current).toHaveProperty('dutyTop3');
      expect(result.current).toHaveProperty('crossTeamRows');
      expect(result.current).toHaveProperty('SCORE_WEIGHTS');

      // Verify SCORE_WEIGHTS values
      expect(result.current.SCORE_WEIGHTS).toEqual({
        dora: 30,
        runs: 15,
        quality: 25,
        availability: 20,
        alerts: 10,
      });
    });
  });

  describe('Jira Top 3 Processing', () => {
    it('should process jira issues correctly with status filtering and fallback logic', () => {
      const member1 = createMockMember({ id: 'member-1', fullName: 'Alice' });
      const member2 = createMockMember({ id: 'member-2', fullName: 'Bob' });
      const member3 = createMockMember({ id: 'member-3', fullName: 'Charlie' });
      const members = [member1, member2, member3];
      const memberById = {
        'member-1': member1,
        'member-2': member2,
        'member-3': member3,
      };

      const jiraIssues = [
        // Valid resolved statuses
        createMockJiraIssue({ assigneeId: 'member-1', status: 'Done' }),
        createMockJiraIssue({ assigneeId: 'member-1', status: 'Resolved' }),
        createMockJiraIssue({ assigneeId: 'member-1', status: 'In Review' }),
        createMockJiraIssue({ assigneeId: 'member-1', status: 'Closed' }),
        // Invalid statuses (should be ignored)
        createMockJiraIssue({ assigneeId: 'member-1', status: 'Open' }),
        createMockJiraIssue({ assigneeId: 'member-1', status: 'In Progress' }),
        // Unknown member (should be ignored)
        createMockJiraIssue({ assigneeId: 'unknown-member', status: 'Done' }),
      ];

      const { result } = renderHook(() =>
        useScoreboardData({
          jiraIssues,
          githubStats: [],
          onDutyData: createMockOnDutyData(),
          memberById,
          members,
          allTeams: [],
        })
      );

      expect(result.current.jiraTop3).toHaveLength(3);
      // Member-1 should have 4 resolved issues
      expect(result.current.jiraTop3[0]).toEqual({
        id: 'member-1',
        count: 4,
        member: member1,
      });
      // Fallback values applied to remaining members
      expect(result.current.jiraTop3[1].count).toBe(9);
      expect(result.current.jiraTop3[2].count).toBe(7);
    });
  });

  describe('GitHub Top 3 Processing', () => {
    it('should process github stats correctly and apply fallback when needed', () => {
      const member1 = createMockMember({ id: 'member-1' });
      const member2 = createMockMember({ id: 'member-2' });
      const member3 = createMockMember({ id: 'member-3' });
      const members = [member1, member2, member3];
      const memberById = {
        'member-1': member1,
        'member-2': member2,
        'member-3': member3,
      };

      const githubStats = [
        createMockGithubStat({ memberId: 'member-1', lines: 25000 }),
        createMockGithubStat({ memberId: 'member-2', lines: 15000 }),
      ];

      const { result } = renderHook(() =>
        useScoreboardData({
          jiraIssues: [],
          githubStats,
          onDutyData: createMockOnDutyData(),
          memberById,
          members,
          allTeams: [],
        })
      );

      expect(result.current.gitTop3).toHaveLength(3);
      expect(result.current.gitTop3[0].lines).toBe(25000);
      expect(result.current.gitTop3[1].lines).toBe(15000);
      // Third member gets fallback value
      expect(result.current.gitTop3[2].lines).toBe(11000);
    });
  });

  describe('Duty Top 3 Processing', () => {
    it('should process on duty and on call data with fallback logic', () => {
      const member1 = createMockMember({ id: 'member-1' });
      const member2 = createMockMember({ id: 'member-2' });
      const member3 = createMockMember({ id: 'member-3' });
      const members = [member1, member2, member3];
      const memberById = {
        'member-1': member1,
        'member-2': member2,
        'member-3': member3,
      };

      const onDutyData = {
        onDuty: [
          { assigneeId: 'member-1' },
          { assigneeId: 'member-1' },
        ],
        onCall: [
          { assigneeId: 'member-1', start: '2024-01-01', end: '2024-01-07' }, // 7 days
          { assigneeId: 'member-2', start: '2024-01-01', end: '2024-01-01' }, // 1 day
          { assigneeId: 'member-2', start: '2024-01-02', end: '2024-01-05' }, // 4 days
        ],
      };

      const { result } = renderHook(() =>
        useScoreboardData({
          jiraIssues: [],
          githubStats: [],
          onDutyData,
          memberById,
          members,
          allTeams: [],
        })
      );

      expect(result.current.dutyTop3).toHaveLength(3);
      expect(result.current.dutyTop3[0]).toEqual({
        id: 'member-1',
        days: 9, // 2 on duty + 7 on call
        member: member1,
      });
      expect(result.current.dutyTop3[1]).toEqual({
        id: 'member-2',
        days: 5, // 0 on duty + 5 on call (1 + 4)
        member: member2,
      });
      // Fallback value for member-3
      expect(result.current.dutyTop3[2].days).toBe(15);
    });
  });

  describe('Cross Team Scoreboard', () => {
    it('should generate cross team rows with proper filtering, sorting, and team sizes', () => {
      const allTeams = [
        createMockTeam({ team: 'Team Alpha' }),
        createMockTeam({ team: 'Team Alpha' }), // Duplicate for size calculation
        createMockTeam({ team: 'Team Beta' }),
        createMockTeam({ team: '' }), // Should be filtered out
        createMockTeam({ team: '   ' }), // Should be filtered out
        createMockTeam({ team: 'Team Gamma' }),
      ];

      const { result } = renderHook(() =>
        useScoreboardData({
          jiraIssues: [],
          githubStats: [],
          onDutyData: createMockOnDutyData(),
          memberById: {},
          members: [],
          allTeams,
        })
      );

      // Should filter out empty team names
      expect(result.current.crossTeamRows).toHaveLength(3);
      
      // Should have all required properties
      const firstTeam = result.current.crossTeamRows[0];
      expect(firstTeam).toHaveProperty('team');
      expect(firstTeam).toHaveProperty('overall');
      expect(firstTeam).toHaveProperty('dora');
      expect(firstTeam).toHaveProperty('runs');
      expect(firstTeam).toHaveProperty('quality');
      expect(firstTeam).toHaveProperty('availability');
      expect(firstTeam).toHaveProperty('alerts');
      expect(firstTeam).toHaveProperty('size');

      // Should be sorted by overall score (descending)
      expect(result.current.crossTeamRows[0].overall).toBeGreaterThanOrEqual(
        result.current.crossTeamRows[1].overall
      );

      // Should calculate team sizes correctly
      const alphaTeam = result.current.crossTeamRows.find(r => r.team === 'Team Alpha');
      const betaTeam = result.current.crossTeamRows.find(r => r.team === 'Team Beta');
      const gammaTeam = result.current.crossTeamRows.find(r => r.team === 'Team Gamma');

      expect(alphaTeam?.size).toBe(2);
      expect(betaTeam?.size).toBe(1);
      expect(gammaTeam?.size).toBe(1);
    });

    it('should handle empty allTeams array', () => {
      const { result } = renderHook(() =>
        useScoreboardData({
          jiraIssues: [],
          githubStats: [],
          onDutyData: createMockOnDutyData(),
          memberById: {},
          members: [],
          allTeams: [],
        })
      );

      expect(result.current.crossTeamRows).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data gracefully', () => {
      const { result } = renderHook(() =>
        useScoreboardData({
          jiraIssues: [],
          githubStats: [],
          onDutyData: createMockOnDutyData(),
          memberById: {},
          members: [],
          allTeams: [],
        })
      );

      expect(result.current.jiraTop3).toHaveLength(0);
      expect(result.current.gitTop3).toHaveLength(0);
      expect(result.current.dutyTop3).toHaveLength(0);
      expect(result.current.crossTeamRows).toHaveLength(0);
    });

    it('should handle null/undefined values in data', () => {
      const member = createMockMember();
      const memberById = { 'member-123': member };

      const jiraIssues = [
        { ...createMockJiraIssue(), status: null },
        { ...createMockJiraIssue(), assigneeId: null },
      ];

      const githubStats = [
        { memberId: null, lines: 1000 },
        { memberId: 'member-123', lines: null },
      ];

      const { result } = renderHook(() =>
        useScoreboardData({
          jiraIssues,
          githubStats,
          onDutyData: createMockOnDutyData(),
          memberById,
          members: [member],
          allTeams: [],
        })
      );

      // Should not crash and handle gracefully
      expect(result.current.jiraTop3).toBeDefined();
      expect(result.current.gitTop3).toBeDefined();
      expect(result.current.dutyTop3).toBeDefined();
    });

    it('should handle members with fewer than 3 available', () => {
      const member = createMockMember();
      const memberById = { 'member-123': member };

      const { result } = renderHook(() =>
        useScoreboardData({
          jiraIssues: [],
          githubStats: [],
          onDutyData: createMockOnDutyData(),
          memberById,
          members: [member], // Only 1 member
          allTeams: [],
        })
      );

      // Should still return up to 3 results with fallbacks
      expect(result.current.jiraTop3).toHaveLength(1);
      expect(result.current.gitTop3).toHaveLength(1);
      expect(result.current.dutyTop3).toHaveLength(1);
    });
  });

  describe('Performance and Behavior', () => {
    it('should recalculate results when dependencies change', () => {
      const member = createMockMember();
      const memberById = { 'member-123': member };
      const members = [member];

      const { result, rerender } = renderHook(
        ({ jiraIssues }) =>
          useScoreboardData({
            jiraIssues,
            githubStats: [],
            onDutyData: createMockOnDutyData(),
            memberById,
            members,
            allTeams: [],
          }),
        {
          initialProps: {
            jiraIssues: [createMockJiraIssue({ status: 'Done' })],
          },
        }
      );

      expect(result.current.jiraTop3[0].count).toBe(1);

      // Update with more issues
      rerender({
        jiraIssues: [
          createMockJiraIssue({ status: 'Done' }),
          createMockJiraIssue({ status: 'Resolved' }),
        ],
      });

      expect(result.current.jiraTop3[0].count).toBe(2);
    });

    it('should maintain referential stability when data does not change', () => {
      const member = createMockMember();
      const memberById = { 'member-123': member };
      const members = [member];
      const jiraIssues = [createMockJiraIssue()];

      const { result, rerender } = renderHook(() =>
        useScoreboardData({
          jiraIssues,
          githubStats: [],
          onDutyData: createMockOnDutyData(),
          memberById,
          members,
          allTeams: [],
        })
      );

      const firstResult = result.current.jiraTop3;
      
      // Rerender with same data
      rerender();
      
      // Results should be the same reference due to memoization
      expect(result.current.jiraTop3).toBe(firstResult);
    });

    it('should handle deterministic cross-team scoring', () => {
      const allTeams = [
        createMockTeam({ team: 'Team Alpha' }),
        createMockTeam({ team: 'Team Beta' }),
      ];

      const { result: result1 } = renderHook(() =>
        useScoreboardData({
          jiraIssues: [],
          githubStats: [],
          onDutyData: createMockOnDutyData(),
          memberById: {},
          members: [],
          allTeams,
        })
      );

      const { result: result2 } = renderHook(() =>
        useScoreboardData({
          jiraIssues: [],
          githubStats: [],
          onDutyData: createMockOnDutyData(),
          memberById: {},
          members: [],
          allTeams,
        })
      );

      // Results should be deterministic (same team names should produce same scores)
      expect(result1.current.crossTeamRows).toEqual(result2.current.crossTeamRows);
    });
  });
});
