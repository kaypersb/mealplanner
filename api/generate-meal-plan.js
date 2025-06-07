// api/generate-meal-plan.js
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
    
    // Your OpenAI API key (add this as environment variable in Vercel)
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const prompt = createAIPrompt(preferences);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
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
      throw new Error(`OpenAI API request failed: ${response.status}`);
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
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

function createAIPrompt(preferences) {
  return `Create a ${preferences.days}-day meal plan for ${preferences.people} people with a budget of PHP ${preferences.budget}.

Requirements:
- Cuisine preference: ${preferences.cuisine}
- Dietary restrictions: ${preferences.restrictions.join(', ') || 'None'}
- Allergies/Avoid: ${preferences.allergies || 'None'}
- Additional preferences: ${preferences.preferences || 'None'}

IMPORTANT: Respond with ONLY valid JSON in this exact format:
{
  "mealPlan": {
    "Day 1": {
      "breakfast": "Tapsilog",
      "lunch": "Chicken Adobo with Rice", 
      "dinner": "Sinigang na Baboy"
    },
    "Day 2": {
      "breakfast": "Pancit Canton",
      "lunch": "Fish Escabeche with Rice",
      "dinner": "Pork Menudo"
    }
  },
  "groceryList": {
    "Meat & Poultry": [
      {
        "name": "Chicken",
        "quantity": "2",
        "unit": "kg",
        "price": 360
      }
    ],
    "Rice & Grains": [
      {
        "name": "Rice",
        "quantity": "5",
        "unit": "kg", 
        "price": 250
      }
    ],
    "Vegetables": [
      {
        "name": "Onions",
        "quantity": "1",
        "unit": "kg",
        "price": 80
      }
    ]
  },
  "totalCost": 1500,
  "tips": "Prep vegetables ahead of time to save cooking time during busy weekdays."
}

Focus on authentic Filipino recipes, realistic portions for ${preferences.people} people for ${preferences.days} days, and accurate Philippine market prices that fit within PHP ${preferences.budget}.`;
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
    return null;
  }
}
