import { describe, it, expect, beforeEach } from 'vitest'
import { getEndpoint } from '../../../utils/app/api'
import { Plugin, PluginID } from '@/types/plugin'

let plugin: { id: PluginID } | null

describe('getEndpoint', () => {
    beforeEach(() => {
        plugin = { id: PluginID.GOOGLE_SEARCH }
    })

    it('should return default endpoint if no plugin is provided', () => {
        plugin = null
        let result = getEndpoint(plugin)
        expect(result).toEqual('api/chat')
    })

    it('should return default endpoint if plugin id is not Google Search', () => {
        plugin = { id: 'SOME_OTHER_PLUGIN' } as Plugin
        let result = getEndpoint(plugin)
        expect(result).toEqual('api/chat')
    })

    it('should return Google endpoint if plugin id is Google Search', () => {
        let result = getEndpoint(plugin)
        expect(result).toEqual('api/google')
    })
})
