*** Settings ***
Library    Browser
Suite Setup    Setup Browser And Login

*** Variables ***
${BASE_URL}    http://localhost:5173

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
TC-02-01: Create Classroom With Valid Data
    Go To Homepage

    # only works if instructor
    Run Keyword And Ignore Error    Wait For Elements State    text=Create Room    visible
    Run Keyword And Ignore Error    Click    css=button.tab:has-text("Create Room")

    Fill Text    input[placeholder="My Classroom"]    Newroom
    Fill Text    input[type="password"]    123456
    Fill Text    input[placeholder="Max students"]    5

    Click    button.btn[type="submit"]


TC-02-02: Create Classroom Missing Required Fields
    Go To Homepage

    Run Keyword And Ignore Error    Click    css=button.tab:has-text("Create Room")

    Fill Text    input[type="password"]    123456
    Fill Text    input[placeholder="Max students"]    5

    Click    button.btn[type="submit"]


TC-02-03: Join Classroom With Wrong Password
    Go To Homepage

    Wait For Elements State    text=Join Room    visible
    Click    css=button.tab:has-text("Join Room")

    Fill Text    input[placeholder="Enter room code"]    08T1DL
    Fill Text    input[type="password"]    wrongpass

    Click    button.btn[type="submit"]

TC-02-04: Join Classroom With Valid Room Code
    Go To Homepage

    Wait For Elements State    text=Join Room    visible
    Click    css=button.tab:has-text("Join Room")

    Fill Text    input[placeholder="Enter room code"]    08T1DL
    Fill Text    input[type="password"]    123456
    Click    button.btn[type="submit"]