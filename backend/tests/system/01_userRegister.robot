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