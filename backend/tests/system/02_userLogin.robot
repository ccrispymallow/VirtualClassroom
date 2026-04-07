*** Settings ***
Library    Browser

*** Variables ***
${BASE_URL}    http://localhost:5173

*** Test Cases ***

TC-02-02: Successful Login With Valid Credentials
    New Page    ${BASE_URL}

    Click    css=button.tab:has-text("Sign In")
    Wait For Elements State    input[placeholder="you@school.edu"]    visible

    Fill Text    input[placeholder="you@school.edu"]    test@email.com
    Fill Text    input[type="password"]    123456

    Click    button.btn[type="submit"]

    Wait For Load State    networkidle


TC-02-02: Login With Wrong Password Returns Error

    New Page    ${BASE_URL}

    Click    css=button.tab:has-text("Sign In")
    Wait For Elements State    input[placeholder="you@school.edu"]    visible

    Fill Text    input[placeholder="you@school.edu"]    test@email.com
    Fill Text    input[type="password"]    wrongpass

    Click    button.btn[type="submit"]

    Wait For Load State    networkidle

TC-02-03: Update Username Successfully
    New Page    ${BASE_URL}/profile
    Fill Text    input[placeholder="Enter your username"]    newusername
    Click    button:has-text("Save Changes")