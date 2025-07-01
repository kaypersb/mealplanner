// api/ai-meal-planner.js
      document.addEventListener('DOMContentLoaded', function() {
            const apiKeyInput = document.getElementById('apiKey');
            const mealTypeSelect = document.getElementById('mealType');
            const cuisineTypeSelect = document.getElementById('cuisineType');
            const dietaryRestrictionsSelect = document.getElementById('dietaryRestrictions');
            const additionalPreferencesInput = document.getElementById('additionalPreferences');
            const generateMealButton = document.getElementById('generateMealButton');
            const randomMeal = document.getElementById('randomMeal');
            const loading = document.getElementById('loading');

            // Load saved API key
            const savedApiKey = localStorage.getItem('geminiApiKey');
            if (savedApiKey) {
                apiKeyInput.value = savedApiKey;
            }

            // Save API key when changed
            apiKeyInput.addEventListener('change', function() {
                localStorage.setItem('geminiApiKey', this.value);
            });

            function getMealIcon(mealType) {
                const icons = {
                    breakfast: '🍳',
                    lunch: '🥪',
                    dinner: '🍽️',
                    snack: '🥨',
                    dessert: '🍰'
                };
                return icons[mealType] || '🍽️';
            }

            function showLoading() {
                loading.style.display = 'block';
                randomMeal.innerHTML = '';
                generateMealButton.disabled = true;
            }

            function hideLoading() {
                loading.style.display = 'none';
                generateMealButton.disabled = false;
            }

            function showError(message) {
                randomMeal.innerHTML = `<div class="error">${message}</div>`;
            }

            async function callGeminiAPI(prompt) {
                const apiKey = apiKeyInput.value.trim();
                
                if (!apiKey) {
                    throw new Error('Please enter your Google Gemini API key');
                }

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: prompt
                            }]
                        }]
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error?.message || 'Failed to get response from Gemini API');
                }

                const data = await response.json();
                return data.candidates[0].content.parts[0].text;
            }

            function buildPrompt() {
                const mealType = mealTypeSelect.value;
                const cuisineType = cuisineTypeSelect.value;
                const dietaryRestrictions = dietaryRestrictionsSelect.value;
                const additionalPreferences = additionalPreferencesInput.value.trim();

                let prompt = `Generate 3 specific ${mealType || 'meal'} suggestions`;
                
                if (cuisineType) {
                    prompt += ` from ${cuisineType} cuisine`;
                }
                
                if (dietaryRestrictions) {
                    prompt += ` that are ${dietaryRestrictions}`;
                }
                
                if (additionalPreferences) {
                    prompt += ` and ${additionalPreferences}`;
                }

                prompt += `. For each meal, provide:
1. Name of the dish
2. Brief description (2-3 sentences)
3. Main ingredients (3-5 items)
4. Estimated cooking time

Format the response clearly with numbered suggestions.`;

                return prompt;
            }

            async function generateAIMeal() {
                const mealType = mealTypeSelect.value;
                
                if (!mealType) {
                    showError('Please select a meal type first.');
                    return;
                }

                showLoading();

                try {
                    const prompt = buildPrompt();
                    const aiResponse = await callGeminiAPI(prompt);
                    
                    randomMeal.innerHTML = `
                        <div class="meal-item">
                            <span class="meal-icon">${getMealIcon(mealType)}</span>
                            <strong>AI-Generated ${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Suggestions:</strong>
                        </div>
                        <div style="white-space: pre-line; margin-top: 15px;">${aiResponse}</div>
                    `;
                } catch (error) {
                    showError(`Error: ${error.message}`);
                } finally {
                    hideLoading();
                }
            }

            generateMealButton.addEventListener('click', generateAIMeal);
        });