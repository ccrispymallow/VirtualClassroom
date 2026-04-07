*** Settings ***
Resource    common.resource


*** Keywords ***
Create Classroom
    [Arguments]    ${room_name}    ${room_code}    ${capacity}=30
    Go To          ${BASE_URL}
    Click          css=button.tab:has-text("Create Room")
    Fill Text      css=input[placeholder="My Classroom"]         ${room_name}
    Fill Text      css=input[placeholder="Room Code"]            ${room_code}
    Fill Text      css=input[type="number"][placeholder="Max students"]    ${capacity}
    Click          css=button[type="submit"]:has-text("Create Classroom")

Join Classroom
    [Arguments]    ${room_code}    ${password}=${EMPTY}
    Go To          ${BASE_URL}
    Fill Text      css=input[placeholder="Enter room code"]    ${room_code}
    Run Keyword If    '${password}' != '${EMPTY}'
    ...    Fill Text    css=input[type="password"]    ${password}
    Click          css=button[type="submit"]:has-text("Join Classroom")

Open Room Menu
    [Arguments]    ${room_name}
    Click          css=.room-item:has-text("${room_name}") .room-menu-btn

Leave Classroom
    [Arguments]    ${room_name}
    Open Room Menu    ${room_name}
    Click          css=.dropdown-menu >> button:has-text("Leave")
    Wait For Elements State    css=.modal    visible
    Click          css=.modal >> button.btn-danger:has-text("Leave")

Delete Classroom
    [Arguments]    ${room_name}
    Open Room Menu    ${room_name}
    Click          css=.dropdown-menu >> button:has-text("Delete")
    Wait For Elements State    css=.modal    visible
    Click          css=.modal >> button.btn-danger:has-text("Delete")
