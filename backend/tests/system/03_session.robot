*** Settings ***
Library    Browser
Suite Setup    Setup Test Session
Suite Teardown    Close Application

*** Variables ***
${BASE_URL}          http://localhost:5173
${TEST_ROOM_NAME}    Newroom
${TEST_ROOM_CODE}    08T1DL

*** Keywords ***
Setup Browser And Login
    New Page    ${BASE_URL}

    Click    css=button.tab:has-text("Sign In")
    Wait For Elements State    input[placeholder="you@school.edu"]    visible

    Fill Text    input[placeholder="you@school.edu"]    test@email.com
    Fill Text    input[type="password"]    123456
    Click    button.btn[type="submit"]

    Wait For Load State    networkidle

    Wait For Elements State    text=Join Room    visible


Go To Homepage
    Go To    ${BASE_URL}/homepage
    Wait For Load State    networkidle
    Wait For Elements State    text=Join Room    visible

*** Test Cases ***
TC-03-01: Start Session For A Room
    Go To Homepage
    Click    css=.modal >> button:has-text("Start Session")
    Wait For Elements State    css=.badge.live    visible    timeout=5s

TC-03-02: Room Shows As Active After Session Starts
    Wait For Elements State
    ...    css=.room-item:has-text("${TEST_ROOM_NAME}") .badge.live
    ...    visible    timeout=10s

TC-03-03: Get Live Session Info
    Go To    ${BASE_URL}/classroom/${TEST_ROOM_CODE}
    Wait For Elements State    text=Session active    visible    timeout=10s

TC-03-04: End Session Successfully
    Open Room Modal
    Click    css=.modal >> button:has-text("End Session")
    Wait For Elements State    css=.badge.offline    visible    timeout=5s

TC-03-05: Room Shows As Offline After Session Ends
    Wait For Elements State
    ...    css=.room-item:has-text("${TEST_ROOM_NAME}") .badge.offline
    ...    visible    timeout=10s