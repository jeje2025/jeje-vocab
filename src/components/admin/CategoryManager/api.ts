import { projectId } from '../../../utils/supabase/info';
import { Category, Vocabulary } from './types';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/server/admin`;

export const categoryApi = {
  // Get all categories
  async getCategories(token: string): Promise<Category[]> {
    const response = await fetch(`${BASE_URL}/categories`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    return data.categories || [];
  },

  // Get vocabularies for a category
  async getVocabularies(token: string, categoryName?: string): Promise<Vocabulary[]> {
    const response = await fetch(`${BASE_URL}/shared-vocabularies`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!data.vocabularies) return [];

    if (categoryName) {
      return data.vocabularies.filter((v: Vocabulary) => v.category === categoryName);
    }
    return data.vocabularies;
  },

  // Update vocabulary (including category change)
  async updateVocabulary(
    token: string,
    vocabId: string,
    updates: { title?: string; category?: string; description?: string }
  ): Promise<void> {
    const response = await fetch(`${BASE_URL}/shared-vocabularies/${vocabId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update vocabulary');
    }
  },

  // Delete vocabulary
  async deleteVocabulary(token: string, vocabId: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/shared-vocabularies/${vocabId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error('Failed to delete vocabulary');
    }
  },

  // Merge vocabularies
  async mergeVocabularies(
    token: string,
    targetVocabId: string,
    sourceVocabIds: string[],
    newTitle?: string
  ): Promise<void> {
    const response = await fetch(`${BASE_URL}/shared-vocabularies/merge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        targetVocabId,
        sourceVocabIds,
        newTitle,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || `Failed to merge vocabularies (${response.status})`;
      console.error('Merge error details:', errorData);
      throw new Error(errorMessage);
    }
  },
};
