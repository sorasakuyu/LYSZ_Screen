import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useDeviceStore = create(
  persist(
    (set) => ({
      currentDevice: null,
      setDevice: (device) => set({ currentDevice: device }),
      clearDevice: () => set({ currentDevice: null }),
    }),
    {
      name: 'device-storage',
    }
  )
)
