*** Settings ***
Resource    common.resource


*** Keywords ***
Navigate To Classroom Chat
    [Arguments]    ${room_code}
    Go To          ${BASE_URL}/classroom/${room_code}
    Wait For Elements State    css=input[placeholder="Type a message…"]    visible    timeout=10s

Send Message In Room
    [Arguments]    ${room_code}    ${message}
    Navigate To Classroom Chat    ${room_code}
    Fill Text      css=input[placeholder="Type a message…"]    ${message}
    Click          css=button:has-text("Send")
    Wait For Elements State    css=div.break-words:has-text("${message}")    visible    timeout=5s

Delete All Messages In Room
    [Arguments]    ${room_code}
    Navigate To Classroom Chat    ${room_code}
    Click          css=button:has-text("Clear Messages")
    Wait For Elements State    css=.modal    visible
    Click          css=.modal >> button.btn-danger:has-text("Confirm")
