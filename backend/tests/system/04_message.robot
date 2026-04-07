*** Settings ***
Library    Browser

*** Variables ***
${BASE_URL}         http://localhost:5173
${VALID_EMAIL}      test@email.com
${VALID_PASSWORD}   123456
${ROOM_CODE}        08T1DL

*** Test Cases ***
TC-04-01: Send Message Successfully
    New Page    ${BASE_URL}
    Click    css=button.tab:has-text("Sign In")
    Wait For Elements State    input[placeholder="you@school.edu"]    visible
    Fill Text    input[placeholder="you@school.edu"]    ${VALID_EMAIL}
    Fill Text    input[type="password"]                 ${VALID_PASSWORD}
    Click    button.btn[type="submit"]
    Wait For Load State    networkidle
    Go To    ${BASE_URL}/classroom/${ROOM_CODE}
    
    Wait For Elements State    css=button:has-text("Chat")    visible    timeout=10s
    Click    css=button:has-text("Chat")
    
    Wait For Elements State    css=input.chat-input    visible    timeout=5s
    Fill Text    css=input.chat-input    Hello everyone!
    Click    css=button:has-text("Send")
    
    Wait For Elements State    text="Hello everyone!"    visible    timeout=5s

TC-04-02: Message Sender Displayed
    New Page    ${BASE_URL}
    Click    css=button.tab:has-text("Sign In")
    Wait For Elements State    input[placeholder="you@school.edu"]    visible
    Fill Text    input[placeholder="you@school.edu"]    ${VALID_EMAIL}
    Fill Text    input[type="password"]                 ${VALID_PASSWORD}
    Click    button.btn[type="submit"]
    Wait For Load State    networkidle
    Go To    ${BASE_URL}/classroom/${ROOM_CODE}
    
    Wait For Elements State    css=button:has-text("Chat")    visible    timeout=10s
    Click    css=button:has-text("Chat")
    
    Wait For Elements State    css=input.chat-input    visible    timeout=5s
    Fill Text    css=input.chat-input    Hello everyone!
    Click    css=button:has-text("Send")
    
    Wait For Elements State    css=span.chat-sender:has-text("testuser")    visible    timeout=5s