*** Settings ***
Library    Browser

*** Variables ***
${BASE_URL}          http://localhost:5173
${VALID_EMAIL}       testuser@test.com
${VALID_PASSWORD}    SecurePass1

*** Keywords ***
Login As Instructor
    Click    css=button.tab:has-text("Sign In")
    Wait For Elements State    input[placeholder="you@school.edu"]    visible
    Fill Text    input[placeholder="you@school.edu"]    ${VALID_EMAIL}
    Fill Text    input[type="password"]                 ${VALID_PASSWORD}
    Click    button.btn[type="submit"]
    Wait For Load State    networkidle

Start Session For Room
    [Arguments]    ${room_name}
    Wait For Elements State    css=.room-item:has-text("${room_name}")    visible    timeout=10s
    Click    css=.room-item:has-text("${room_name}")
    Wait For Elements State    css=.modal    visible    timeout=5s
    Click    css=.modal >> button:has-text("Start Session")

End Session For Room
    [Arguments]    ${room_name}
    Wait For Elements State    css=.room-item:has-text("${room_name}")    visible    timeout=10s
    Click    css=.room-item:has-text("${room_name}")
    Wait For Elements State    css=.modal    visible    timeout=5s
    Click    css=.modal >> button:has-text("End Session")

Navigate To Classroom
    [Arguments]    ${room_code}
    Go To    ${BASE_URL}/classroom/${room_code}
    Wait For Elements State    css=.meeting-layout    visible    timeout=10s

Login First
    New Page    ${BASE_URL}
    Login As Instructor