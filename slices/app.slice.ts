import { useDispatch, useSelector } from 'react-redux';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { State, Dispatch } from '@/utils/store';
import { User } from '@/types';

export interface AppState {
  checked: boolean;
  loggedIn: boolean;
  user?: User;
  cartClearedAt: number | null;
}

const initialState: AppState = {
  checked: false,
  loggedIn: false,
  user: undefined,
  cartClearedAt: null,
};

const slice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setChecked: (state: AppState, { payload }: PayloadAction<boolean>) => {
      state.checked = payload;
    },
    /** Also sets checked=true so callers don't need to dispatch setChecked separately. */
    setLoggedIn: (state: AppState, { payload }: PayloadAction<boolean>) => {
      state.checked = true;
      state.loggedIn = payload;
    },
    setUser: (state: AppState, { payload }: PayloadAction<User | undefined>) => {
      state.user = payload;
    },
    markCartCleared: (state: AppState, { payload }: PayloadAction<number>) => {
      state.cartClearedAt = payload;
    },
    reset: () => initialState,
  },
});

export function useAppSlice() {
  const dispatch = useDispatch<Dispatch>();
  const state = useSelector(({ app }: State) => app);
  return { dispatch, ...state, ...slice.actions };
}

export default slice.reducer;
