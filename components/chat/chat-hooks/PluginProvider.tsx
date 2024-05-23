"use client"

import React, {
  createContext,
  useReducer,
  useContext,
  useEffect,
  Dispatch
} from "react"

import { PluginSummary } from "@/types/plugins"

import { availablePlugins } from "@/lib/plugins/available-plugins"

enum ActionTypes {
  INSTALL_PLUGIN = "INSTALL_PLUGIN",
  UNINSTALL_PLUGIN = "UNINSTALL_PLUGIN"
}

const initialState = {
  installedPlugins: [] as PluginSummary[]
}

const PluginContext = createContext<{
  state: typeof initialState
  dispatch: React.Dispatch<any>
}>({
  state: initialState,
  dispatch: () => null
})

const pluginReducer = (
  state: { installedPlugins: any[] },
  action: { type: any; payload: { id: any } }
) => {
  switch (action.type) {
    case ActionTypes.INSTALL_PLUGIN:
      if (!state.installedPlugins.some(p => p.id === action.payload.id)) {
        const updatedPlugins = [...state.installedPlugins, action.payload]
        localStorage.setItem("installedPlugins", JSON.stringify(updatedPlugins))
        return { ...state, installedPlugins: updatedPlugins }
      }
      return state
    case ActionTypes.UNINSTALL_PLUGIN:
      const updatedPlugins = state.installedPlugins.filter(
        p => p.id !== action.payload
      )
      localStorage.setItem("installedPlugins", JSON.stringify(updatedPlugins))
      return { ...state, installedPlugins: updatedPlugins }
    default:
      return state
  }
}

export const PluginProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(pluginReducer, initialState)

  useEffect(() => {
    const localData = localStorage.getItem("installedPlugins")
    let installedPlugins = localData ? JSON.parse(localData) : []

    const defaultPluginIds = [1, 2, 3, 4, 5, 6]

    if (!localData) {
      defaultPluginIds.forEach(id => {
        const defaultPlugin = availablePlugins.find(p => p.id === id)
        if (defaultPlugin) {
          installedPlugins.push({ ...defaultPlugin, isInstalled: true })
        }
      })

      localStorage.setItem("installedPlugins", JSON.stringify(installedPlugins))
    }

    installedPlugins.forEach((plugin: any) => {
      dispatch({ type: ActionTypes.INSTALL_PLUGIN, payload: plugin })
    })
  }, [])

  return (
    <PluginContext.Provider value={{ state, dispatch }}>
      {children}
    </PluginContext.Provider>
  )
}

export const usePluginContext = () => useContext(PluginContext)
