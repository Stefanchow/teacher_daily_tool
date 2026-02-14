import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../../utils/supabase';

interface UserState {
  session: Session | null;
  user: User | null;
  points: number;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  session: null,
  user: null,
  points: 0,
  loading: true,
  error: null,
};

// Thunk to fetch user points
export const fetchUserPoints = createAsyncThunk(
  'user/fetchPoints',
  async (userId: string, { rejectWithValue }) => {
    try {
      // Assuming a 'profiles' table with a 'points' column.
      // Adjust table name if different (e.g., 'user_credits', 'users').
      const { data, error } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', userId)
        .single();

      if (error) {
        // If the table doesn't exist or user not found, we might want to return 0 or handle it.
        // For now, if error, we assume 0 or throw.
        console.error('Error fetching points:', error);
        // If it's a "PGRST116" (no rows) error, it might mean the trigger hasn't run or profile not created yet.
        return 0;
      }

      return data?.points || 0;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setSession(state, action: PayloadAction<Session | null>) {
      state.session = action.payload;
      state.user = action.payload?.user || null;
      if (!action.payload) {
        state.points = 0;
      }
      state.loading = false;
    },
    setPoints(state, action: PayloadAction<number>) {
      state.points = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserPoints.fulfilled, (state, action) => {
        state.points = action.payload;
      })
      .addCase(fetchUserPoints.rejected, (state, action) => {
        console.error('Failed to fetch points:', action.payload);
      });
  },
});

export const { setSession, setPoints, setLoading } = userSlice.actions;
export default userSlice.reducer;
