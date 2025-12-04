import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Import the hook to test
import { useUserManagement } from '../../src/hooks/team/useUserManagement';

// Import types
import type { Member as DutyMember } from '../../src/hooks/useOnDutyData';
import type { CreateUserRequest, User } from '../../src/types/api';

// Mock mutation functions
const mockDeleteMutate = vi.fn();
const mockUpdateMutate = vi.fn();
const mockCreateMutate = vi.fn();
const mockToast = vi.fn();

// Mock dependencies with controllable implementations
vi.mock('../../src/hooks/api/mutations/useMemberMutations', () => ({
  useDeleteMember: vi.fn(() => ({
    mutate: mockDeleteMutate,
    isPending: false,
    error: null,
  })),
  useUpdateUserTeam: vi.fn(() => ({
    mutate: mockUpdateMutate,
    isPending: false,
    error: null,
  })),
  useCreateUser: vi.fn(() => ({
    mutate: mockCreateMutate,
    isPending: false,
    error: null,
  })),
}));

vi.mock('../../src/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('../../src/hooks/useAuthWithRole', () => ({
  useAuthWithRole: () => ({
    memberData: {
      id: 'current-user-123',
      uuid: 'current-uuid-123',
      team_id: 'team-123',
      first_name: 'Current',
      last_name: 'User',
      email: 'current@example.com',
    },
    memberError: null,
  }),
}));

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// Mock data factories
const createMockMember = (overrides?: Partial<DutyMember>): DutyMember => ({
  id: 'member-123',
  fullName: 'John Doe',
  email: 'john@example.com',
  role: 'Developer',
  iuser: 'jdoe',
  avatar: '',
  team: 'team-123',
  uuid: 'uuid-123',
  ...overrides,
});

// ============================================================================
// TESTS
// ============================================================================

describe('useUserManagement Hook', () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: ReactNode }) => JSX.Element;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
    wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
    queryClient.getQueryCache().clear();
    queryClient.getMutationCache().clear();
  });

  describe('Basic Functionality', () => {
    it('should initialize with default state and handle dialog operations', () => {
      const { result } = renderHook(() => useUserManagement({}), { wrapper });

      // Test initial state
      expect(result.current.members).toEqual([]);
      expect(result.current.memberDialogOpen).toBe(false);
      expect(result.current.editingMember).toBe(null);
      expect(result.current.memberForm).toEqual({
        fullName: '',
        email: '',
        role: '',
        avatar: '',
        team: ''
      });

      // Test opening add member dialog
      act(() => {
        result.current.openAddMember();
      });

      expect(result.current.memberDialogOpen).toBe(true);
      expect(result.current.editingMember).toBe(null);

      // Test setting dialog state
      act(() => {
        result.current.setMemberDialogOpen(false);
      });

      expect(result.current.memberDialogOpen).toBe(false);
    });

    it('should update member form', () => {
      const { result } = renderHook(() => useUserManagement({}), { wrapper });

      const newFormData = {
        fullName: 'Jane Smith',
        email: 'jane@example.com',
        role: 'Manager',
        avatar: 'https://example.com/avatar.jpg',
        team: 'team-456'
      };

      act(() => {
        result.current.setMemberForm(newFormData);
      });

      expect(result.current.memberForm).toEqual(newFormData);
    });
  });

  describe('Member Management', () => {
    it('should initialize with initial members and handle edit dialog', () => {
      const member1 = createMockMember({ id: 'member-1' });
      const member2 = createMockMember({ id: 'member-2' });
      const initialMembers = [member1, member2];

      const { result } = renderHook(
        () => useUserManagement({ initialMembers }),
        { wrapper }
      );

      expect(result.current.members).toHaveLength(2);
      expect(result.current.members[0].id).toBe('member-1');
      expect(result.current.members[1].id).toBe('member-2');

      // Test opening edit member dialog
      act(() => {
        result.current.openEditMember(member1);
      });

      expect(result.current.memberDialogOpen).toBe(true);
      expect(result.current.editingMember).toEqual(member1);
      expect(result.current.memberForm).toEqual(member1);
    });
  });

  describe('Delete Member Operations', () => {
    it('should handle delete member with optimistic update and callbacks', async () => {
      const member1 = createMockMember({ id: 'member-1' });
      const member2 = createMockMember({ id: 'member-2' });
      const initialMembers = [member1, member2];
      const onMembersChange = vi.fn();

      const { result } = renderHook(
        () => useUserManagement({ initialMembers, onMembersChange }),
        { wrapper }
      );

      // Test optimistic update
      act(() => {
        result.current.deleteMember('member-1');
      });

      expect(result.current.members).toHaveLength(1);
      expect(result.current.members[0].id).toBe('member-2');
      expect(onMembersChange).toHaveBeenCalledWith([member2]);
      expect(mockDeleteMutate).toHaveBeenCalledWith('member-1');

      // Test success callback
      const { useDeleteMember } = await import('../../src/hooks/api/mutations/useMemberMutations');
      const mockDeleteMemberHook = useDeleteMember as any;
      const lastCall = mockDeleteMemberHook.mock.calls[mockDeleteMemberHook.mock.calls.length - 1];
      const options = lastCall[0];

      act(() => {
        options.onSuccess(undefined, 'member-1');
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "Member deleted successfully",
        description: "The team member has been removed from your team.",
      });
    });

    it('should handle delete member error with rollback', async () => {
      const member1 = createMockMember({ id: 'member-1' });
      const member2 = createMockMember({ id: 'member-2' });
      const initialMembers = [member1, member2];

      const { result } = renderHook(
        () => useUserManagement({ initialMembers }),
        { wrapper }
      );

      act(() => {
        result.current.deleteMember('member-1');
      });

      expect(result.current.members).toHaveLength(1);

      // Test error callback with rollback
      const { useDeleteMember } = await import('../../src/hooks/api/mutations/useMemberMutations');
      const mockDeleteMemberHook = useDeleteMember as any;
      const lastCall = mockDeleteMemberHook.mock.calls[mockDeleteMemberHook.mock.calls.length - 1];
      const options = lastCall[0];

      act(() => {
        options.onError(new Error('Delete failed'), 'member-1');
      });

      expect(result.current.members).toHaveLength(2);
      expect(result.current.members[0].id).toBe('member-1');
      expect(mockToast).toHaveBeenCalledWith({
        variant: "destructive",
        title: "Failed to delete member",
        description: "There was an error removing the member. Please try again.",
      });
    });

    it('should handle delete member when member not found', () => {
      const member = createMockMember({ id: 'member-1' });
      const initialMembers = [member];

      const { result } = renderHook(
        () => useUserManagement({ initialMembers }),
        { wrapper }
      );

      act(() => {
        result.current.deleteMember('non-existent-id');
      });

      expect(mockDeleteMutate).not.toHaveBeenCalled();
      expect(result.current.members).toHaveLength(1);
    });
  });

  describe('Move Member Operations', () => {
    it('should move member successfully with optimistic update and callbacks', async () => {
      const member1 = createMockMember({ id: 'member-1', uuid: 'uuid-1' });
      const member2 = createMockMember({ id: 'member-2', uuid: 'uuid-2' });
      const initialMembers = [member1, member2];
      const onMembersChange = vi.fn();
      const onMoveMember = vi.fn();
      const teamNameToIdMap = vi.fn().mockReturnValue('target-team-id');

      const { result } = renderHook(
        () => useUserManagement({ 
          initialMembers, 
          onMembersChange, 
          onMoveMember, 
          teamNameToIdMap 
        }),
        { wrapper }
      );

      act(() => {
        result.current.moveMember(member1, 'target-team');
      });

      expect(result.current.members).toHaveLength(1);
      expect(result.current.members[0].id).toBe('member-2');
      expect(onMembersChange).toHaveBeenCalledWith([member2]);
      expect(onMoveMember).toHaveBeenCalledWith(member1, 'target-team');
      expect(teamNameToIdMap).toHaveBeenCalledWith('target-team');
      expect(mockUpdateMutate).toHaveBeenCalledWith({
        user_uuid: 'uuid-1',
        new_team_uuid: 'target-team-id'
      });

      // Test success callback
      const { useUpdateUserTeam } = await import('../../src/hooks/api/mutations/useMemberMutations');
      const mockUpdateUserTeamHook = useUpdateUserTeam as any;
      const lastCall = mockUpdateUserTeamHook.mock.calls[mockUpdateUserTeamHook.mock.calls.length - 1];
      const options = lastCall[0];

      act(() => {
        options.onSuccess({}, { user_uuid: 'uuid-1', new_team_uuid: 'target-team-id' });
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: "Member moved successfully",
        description: "Member has been moved to the new team.",
      });
    });

    it('should handle move member validation errors', () => {
      const member = createMockMember({ id: 'member-1', uuid: 'uuid-1' });
      const initialMembers = [member];
      const teamNameToIdMap = vi.fn().mockReturnValue(undefined);

      const { result } = renderHook(
        () => useUserManagement({ initialMembers, teamNameToIdMap }),
        { wrapper }
      );

      // Test team ID not found
      act(() => {
        result.current.moveMember(member, 'invalid-team');
      });

      expect(mockToast).toHaveBeenCalledWith({
        variant: "destructive",
        title: "Failed to move member",
        description: "Could not find the target team ID. Please try again.",
      });
      expect(mockUpdateMutate).not.toHaveBeenCalled();

      // Clear previous calls
      mockToast.mockClear();

      // Test member without UUID - create new hook instance to avoid state issues
      const memberNoUuid = createMockMember({ id: 'member-2', uuid: undefined });
      const { result: result2 } = renderHook(
        () => useUserManagement({ initialMembers: [memberNoUuid] }),
        { wrapper }
      );

      act(() => {
        result2.current.moveMember(memberNoUuid, 'target-team');
      });

      expect(mockToast).toHaveBeenCalledWith({
        variant: "destructive",
        title: "Failed to move member",
        description: "Member UUID not available. Please try again.",
      });
    });

    it('should handle move member error with rollback', async () => {
      const member1 = createMockMember({ id: 'member-1', uuid: 'uuid-1' });
      const member2 = createMockMember({ id: 'member-2', uuid: 'uuid-2' });
      const initialMembers = [member1, member2];

      const { result } = renderHook(
        () => useUserManagement({ initialMembers }),
        { wrapper }
      );

      act(() => {
        result.current.moveMember(member1, 'target-team');
      });

      expect(result.current.members).toHaveLength(1);

      // Test error callback with rollback
      const { useUpdateUserTeam } = await import('../../src/hooks/api/mutations/useMemberMutations');
      const mockUpdateUserTeamHook = useUpdateUserTeam as any;
      const lastCall = mockUpdateUserTeamHook.mock.calls[mockUpdateUserTeamHook.mock.calls.length - 1];
      const options = lastCall[0];

      act(() => {
        options.onError(new Error('Move failed'), { user_uuid: 'uuid-1', new_team_uuid: 'target-team-id' });
      });

      expect(result.current.members).toHaveLength(2);
      expect(result.current.members[0].id).toBe('member-1');
      expect(mockToast).toHaveBeenCalledWith({
        variant: "destructive",
        title: "Failed to move member",
        description: "There was an error moving the member. Please try again.",
      });
    });
  });

  describe('Create Member Operations', () => {
    it('should handle create member with optimistic update and callbacks', async () => {
      const initialMembers: DutyMember[] = [];
      const onMembersChange = vi.fn();

      const { result } = renderHook(
        () => useUserManagement({ initialMembers, onMembersChange }),
        { wrapper }
      );

      const createUserPayload: CreateUserRequest = {
        email: 'new@example.com',
        first_name: 'New',
        last_name: 'User',
        id: 'newuser',
        team_id: 'team-123',
        team_role: 'developer'
      };

      act(() => {
        result.current.createMember(createUserPayload);
      });

      // Test optimistic update
      expect(result.current.members).toHaveLength(1);
      expect(result.current.members[0].fullName).toBe('New User');
      expect(result.current.members[0].email).toBe('new@example.com');
      expect(result.current.members[0].role).toBe('developer');
      expect(result.current.memberDialogOpen).toBe(false);
      expect(onMembersChange).toHaveBeenCalled();
      expect(mockCreateMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createUserPayload,
          tempId: expect.stringMatching(/^temp_\d+$/)
        })
      );

      const tempId = result.current.members[0].id;

      // Test success callback
      const { useCreateUser } = await import('../../src/hooks/api/mutations/useMemberMutations');
      const mockCreateUserHook = useCreateUser as any;
      const lastCall = mockCreateUserHook.mock.calls[mockCreateUserHook.mock.calls.length - 1];
      const options = lastCall[0];

      const serverResponse: User = {
        id: 'real-user-id',
        name: 'newuser',
        email: 'new@example.com',
        first_name: 'New',
        last_name: 'User'
      };

      act(() => {
        options.onSuccess(serverResponse, { ...createUserPayload, tempId });
      });

      expect(result.current.members[0].id).toBe('real-user-id');
      expect(result.current.members[0].fullName).toBe('New User');
      expect(mockToast).toHaveBeenCalledWith({
        title: "Member created successfully",
        description: "New User has been added to the team.",
      });
    });

    it('should handle create member error with rollback and existing user', async () => {
      const initialMembers: DutyMember[] = [];

      const { result } = renderHook(
        () => useUserManagement({ initialMembers }),
        { wrapper }
      );

      const createUserPayload: CreateUserRequest = {
        email: 'new@example.com',
        first_name: 'New',
        last_name: 'User',
        id: 'newuser',
        team_id: 'team-123'
      };

      act(() => {
        result.current.createMember(createUserPayload);
      });

      expect(result.current.members).toHaveLength(1);
      const tempId = result.current.members[0].id;

      const { useCreateUser } = await import('../../src/hooks/api/mutations/useMemberMutations');
      const mockCreateUserHook = useCreateUser as any;
      const lastCall = mockCreateUserHook.mock.calls[mockCreateUserHook.mock.calls.length - 1];
      const options = lastCall[0];

      // Test general error with rollback
      act(() => {
        options.onError(new Error('Create failed'), { ...createUserPayload, tempId });
      });

      expect(result.current.members).toHaveLength(0);
      expect(mockToast).toHaveBeenCalledWith({
        variant: "destructive",
        title: "Failed to create member",
        description: "There was an error creating the member. Please try again.",
      });

      // Test existing user error
      act(() => {
        result.current.createMember(createUserPayload);
      });

      const newTempId = result.current.members[0].id;
      const error = new Error('User exists') as Error & { apiError?: { message?: string } };
      error.apiError = { message: 'Member with this email already exists in the organization' };

      act(() => {
        options.onError(error, { ...createUserPayload, tempId: newTempId });
      });

      expect(mockToast).toHaveBeenCalledWith({
        variant: "destructive",
        title: "Member already exists",
        description: "Member already exists in the organization.",
      });
    });
  });

  describe('Props and State Management', () => {
    it('should handle initialMembers prop changes and form reset', () => {
      const member1 = createMockMember({ id: 'member-1' });
      const member2 = createMockMember({ id: 'member-2' });
      const initialMembers = [member1];
      const onMembersChange = vi.fn();

      const { result, rerender } = renderHook(
        ({ initialMembers }) => useUserManagement({ initialMembers, onMembersChange }),
        { 
          wrapper,
          initialProps: { initialMembers }
        }
      );

      expect(result.current.members).toHaveLength(1);

      // Test prop changes
      rerender({ initialMembers: [member1, member2] });
      expect(result.current.members).toHaveLength(2);

      // Test empty initialMembers (should keep existing)
      rerender({ initialMembers: [] });
      expect(result.current.members).toHaveLength(2);

      // Test form reset when opening add member dialog
      act(() => {
        result.current.setMemberForm({
          fullName: 'Test User',
          email: 'test@example.com',
          role: 'developer'
        });
      });

      expect(result.current.memberForm.fullName).toBe('Test User');

      act(() => {
        result.current.openAddMember();
      });

      expect(result.current.memberForm).toEqual({
        fullName: '',
        email: '',
        role: '',
        avatar: '',
        team: ''
      });
      expect(result.current.memberDialogOpen).toBe(true);
      expect(result.current.editingMember).toBe(null);

      // Test onMembersChange callback
      act(() => {
        result.current.deleteMember('member-1');
      });

      expect(onMembersChange).toHaveBeenCalled();
    });

    it('should handle create member edge cases', () => {
      const initialMembers: DutyMember[] = [];

      const { result } = renderHook(
        () => useUserManagement({ initialMembers }),
        { wrapper }
      );

      // Test default role when team_role not provided
      const createUserPayload: CreateUserRequest = {
        email: 'new@example.com',
        first_name: 'New',
        last_name: 'User',
        id: 'newuser123',
        team_id: 'team-123'
      };

      act(() => {
        result.current.createMember(createUserPayload);
      });

      expect(result.current.members[0].role).toBe('member');
      expect(result.current.members[0].iuser).toBe('newuser123');
    });
  });
});
