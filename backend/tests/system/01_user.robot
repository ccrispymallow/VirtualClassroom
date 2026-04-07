*** Settings ***
Library    Browser

*** Variables ***
${BASE_URL}    http://localhost:5173

*** Test Cases ***

TC-01-01: Successful Registration With Valid Data
    New Page    ${BASE_URL}

    Click    text=Register
    Wait For Elements State    input[placeholder="johndoe"]    visible

    Fill Text    input[placeholder="johndoe"]    testuser
    Fill Text    input[placeholder="you@school.edu"]    test@email.com
    Fill Text    input[type="password"]    123456

    Select Options By    select    value    instructor

    Click    button.btn[type="submit"]


TC-01-02: Registration With Missing Fields Returns Error
    New Page    ${BASE_URL}
    Click    text=Register
    Wait For Elements State    input[placeholder="johndoe"]    visible

    Fill Text    input[placeholder="johndoe"]    testuser
    Fill Text    input[type="password"]    123456
    Select Options By    select    value    instructor

    Click    button.btn[type="submit"]


TC-01-03: Successful Login With Valid Credentials
    New Page    ${BASE_URL}

    Click    css=button.tab:has-text("Sign In")
    Wait For Elements State    input[placeholder="you@school.edu"]    visible

    Fill Text    input[placeholder="you@school.edu"]    test@email.com
    Fill Text    input[type="password"]    123456

    Click    button.btn[type="submit"]

    Wait For Load State    networkidle


TC-01-04: Login With Wrong Password Returns Error

    New Page    ${BASE_URL}

    Click    css=button.tab:has-text("Sign In")
    Wait For Elements State    input[placeholder="you@school.edu"]    visible

    Fill Text    input[placeholder="you@school.edu"]    test@email.com
    Fill Text    input[type="password"]    wrongpass

    Click    button.btn[type="submit"]

    Wait For Load State    networkidle

TC-01-05: Update Username Successfully
    New Page    ${BASE_URL}/profile
    Fill Text    input[placeholder="Enter your username"]    newusername
    Click    button:has-text("Save Changes")