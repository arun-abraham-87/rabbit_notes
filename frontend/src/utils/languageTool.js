/**
 * Checks text for grammar and spelling issues using LanguageTool API
 * @param {string} text - The text to check
 * @returns {Promise<Object>} - The API response containing matches and suggestions
 */
export const checkText = async (text) => {
  try {
    const response = await fetch('https://api.languagetool.org/v2/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        text,
        language: 'en-US',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to check text');
    }

    return await response.json();
  } catch (error) {
    console.error('Error checking text:', error);
    throw error;
  }
}; 