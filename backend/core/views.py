import os
from rest_framework.decorators import api_view
from rest_framework.response import Response
from groq import Groq

@api_view(['POST'])
def test_chat(request):
    user_message = request.data.get('message', '')
    
    # Initialize Groq client using the environment variable mapped via Docker
    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
    
    try:
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",  
            messages=[
                {"role": "system", "content": "You are a helpful technical coding assistant."},
                {"role": "user", "content": user_message}
            ]
        )
        ai_response = completion.choices[0].message.content
        return Response({"status": "success", "response": ai_response})
        
    except Exception as e:
        return Response({"status": "error", "message": str(e)}, status=500)