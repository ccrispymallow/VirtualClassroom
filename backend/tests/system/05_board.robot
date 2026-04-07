*** Settings ***
Resource          resources/board_keywords.resource
Suite Setup       Setup Board Suite
Suite Teardown    Close Application

*** Variables ***
${TEST_ROOM_CODE}    08T1DL

*** Keywords ***
Setup Board Suite
    Open Application
    Login As Test User

*** Test Cases ***

TC-05-01: Create A Note On The Board
    [Tags]    board    note    smoke    priority-critical
    Create Note On Board    ${TEST_ROOM_CODE}    Remember to submit homework!    yellow
    Wait For Elements State    text="Remember to submit homework!"    attached    timeout=5s

TC-05-02: Create Note Without Text Does Nothing
    [Tags]    board    note    validation    priority-high
    Navigate To Board    ${TEST_ROOM_CODE}
    
    Force Fill Text        css=textarea[placeholder="Write a note..."]    ${EMPTY}
    Force Click Element    button:has-text("Add")
    
    Wait For Elements State    css=textarea[placeholder="Write a note..."]    attached    timeout=3s


TC-05-03: Create An Announcement
    [Tags]    board    announcement    smoke    priority-critical
    Create Announcement    ${TEST_ROOM_CODE}    Welcome to the class!
    Wait For Elements State    text="Welcome to the class!"    attached    timeout=5s


