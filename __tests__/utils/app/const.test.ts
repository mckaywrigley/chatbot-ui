import {API_BASE_URL, API_ENTRYPOINT, APP_NAME, AUTH_ENDPOINT, AZURE_DEPLOYMENT_ID, DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE, LOGIN_REQUIRED, LOG_INCOMING_MESSAGES, LOG_TRIM_MESSAGES, OPENAI_API_HOST, OPENAI_API_TYPE, OPENAI_API_VERSION, OPENAI_ORGANIZATION, PRIVATE_API_ENTRYPOINT, PROMPT_ENDPOINT, PUBLIC_API_ENTRYPOINT, WORKSPACES_ENDPOINT } from '@/utils/app/const';
import { describe, expect, it } from 'vitest';
describe('Check const.ts and .env vars', () => {
    it('should return true if DEFAULT_SYSTEM_PROMPT is not null', () => {
        expect(DEFAULT_SYSTEM_PROMPT).not.toBeNull();
      });
      it('should return true if OPENAI_API_HOST is not null', () => {
        expect(OPENAI_API_HOST).not.toBeNull();
      });
      it('should return true if DEFAULT_TEMPERATURE is not null', () => {
        expect(DEFAULT_TEMPERATURE).not.toBeNull();
      });
      it('should return true if OPENAI_API_TYPE is not null', () => {
        expect(OPENAI_API_TYPE).not.toBeNull();
      });
      it('should return true if OPENAI_API_VERSION is not null', () => {
        expect(OPENAI_API_VERSION).not.toBeNull();
      });
      it('should return true if OPENAI_ORGANIZATION is not null', () => {
        expect(OPENAI_ORGANIZATION).not.toBeNull();
      });
      it('should return true if API_ENTRYPOINT is not null', () => {
        expect(API_ENTRYPOINT).not.toBeNull();
      });
      it('should return true if PRIVATE_API_ENTRYPOINT is not null', () => {
        expect(PRIVATE_API_ENTRYPOINT).not.toBeNull();
      });
      it('should return true if WORKSPACES_ENDPOINT is not null', () => {
        expect(WORKSPACES_ENDPOINT).not.toBeNull();
      });
      it('should return true if PROMPT_ENDPOINT is not null', () => {
        expect(PROMPT_ENDPOINT).not.toBeNull();
      });
      it('should return true if APP_NAME is not null', () => {
        expect(APP_NAME).not.toBeNull();
      });
      it('should return true if AZURE_DEPLOYMENT_ID is not null', () => {
        expect(AZURE_DEPLOYMENT_ID).not.toBeNull();
      });
      it('should return true if LOGIN_REQUIRED is not null', () => {
        expect(LOGIN_REQUIRED).not.toBeNull();
      });
      it('should return true if API_BASE_URL is not null', () => {
        expect(API_BASE_URL).not.toBeNull();
      });
      it('should return true if LOG_INCOMING_MESSAGES is not null', () => {
        expect(LOG_INCOMING_MESSAGES).not.toBeNull();
      });
      it('should return true if LOG_TRIM_MESSAGES is not null', () => {
        expect(LOG_TRIM_MESSAGES).not.toBeNull();
      });
      it('should return true if PUBLIC_API_ENTRYPOINT is not null', () => {
        expect(PUBLIC_API_ENTRYPOINT).not.toBeNull();
      });
      it('should return true if AUTH_ENDPOINT is not null', () => {
        expect(AUTH_ENDPOINT).not.toBeNull();
      });
    });