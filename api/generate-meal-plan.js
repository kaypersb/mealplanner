// api/generate-meal-plan-vercel.js
// Using Vercel AI Gateway - Free during Alpha!

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { preferences } = req.body;
    
    const prompt = createAIPrompt(preferences);
    
    // Using Vercel AI Gateway - no API key needed!
    const response = await fetch('https://gateway.ai.vercel.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VERCEL_AI_GATEWAY_TOKEN || 'demo'}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo', // Free model through gateway
        messages: [
          {
            role: 'system',
            content: 'You are a Filipino meal planning expert who creates culturally appropriate, budget-conscious meal plans with accurate Philippine grocery prices. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      console.error('AI Gateway request failed:', response.status, await response.text());
      throw new Error(`AI Gateway request failed: ${response.status}`);
    }

    const data = await response.json();
    const aiContent = data.choices[0].message.content;
    
    // Parse the AI response
    const parsedResponse = parseAIResponse(aiContent);
    
    if (!parsedResponse) {
      throw new Error('Failed to parse AI response');
    }

    res.status(200).json({
      success: true,
      data: parsedResponse
    });

  } catch (error) {
    console.error('Error generating meal plan:', error);
    
    // Return error response so frontend falls back to static generation
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

function createAIPrompt(preferences) {
  const days = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
  const selectedDays = days.slice(0, preferences.days);

  return `Create a ${preferences.days}-day Filipino meal plan for ${preferences.people} people with a budget of PHP ${preferences.budget}.

Requirements:
- Cuisine preference: ${preferences.cuisine}
- Dietary restrictions: ${preferences.restrictions.join(', ') || 'None'}
- Allergies/Avoid: ${preferences.allergies || 'None'}
- Additional preferences: ${preferences.preferences || 'None'}

CRITICAL: You must respond with ONLY valid JSON. No explanations, no markdown, just pure JSON.

Required JSON structure:
{
  "mealPlan": {
    ${selectedDays.map(day => `"${day}": {"breakfast": "dish name", "lunch": "dish name", "dinner": "dish name"}`).join(',\n    ')}
  },
  "groceryList": {
    "Meat & Poultry": [{"name": "ingredient", "quantity": "2", "unit": "kg", "price": 360}],
    "Rice & Grains": [{"name": "Rice", "quantity": "5", "unit": "kg", "price": 250}],
    "Vegetables": [{"name": "ingredient", "quantity": "1", "unit": "kg", "price": 80}],
    "Pantry": [{"name": "ingredient", "quantity": "1", "unit": "bottle", "price": 30}]
  },
  "totalCost": 1500,
  "tips": "helpful cooking tip"
}

Rules:
- Use authentic Filipino dishes only
- Realistic portions for ${preferences.people} people for ${preferences.days} days
- Accurate Philippine market prices
- Stay within PHP ${preferences.budget} budget
- All prices must be numbers (not strings)
- Include variety in meals across days

Respond with JSON only:`;
}

function parseAIResponse(content) {
  try {
    // Clean up the response to extract JSON
    let cleanContent = content.trim();
    
    // Remove any markdown code blocks
    cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Find JSON object
    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // If no match, try parsing the whole content
    return JSON.parse(cleanContent);
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    
    // Return a basic fallback structure
    return {
      mealPlan: {
        "Day 1": {
          breakfast: "Tapsilog",
          lunch: "Chicken Adobo with Rice",
          dinner: "Sinigang na Baboy"
        }
      },
      groceryList: {
        "Staples": [
          { name: "Rice", quantity: "5", unit: "kg", price: 250 }
        ]
      },
      totalCost: 1500,
      tips: "AI parsing failed, using basic meal plan."
    };
  }
}
