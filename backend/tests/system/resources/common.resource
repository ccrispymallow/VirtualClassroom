*** Settings ***
Library    Browser


*** Variables ***
${BASE_URL}         http://localhost:5173
${BROWSER}          chromium
${HEADLESS}         True
${VALID_EMAIL}      testuser@test.com
${VALID_PASSWORD}   SecurePass1
${VALID_USERNAME}   testuser


*** Keywords ***
Open Application
    New Browser    ${BROWSER}    headless=${HEADLESS}
    New Page       ${BASE_URL}

Close Application
    Close Browser

Login As Test User
    Go To          ${BASE_URL}
    Click    css=button.tab:has-text("Sign In")
    Wait For Elements State    input[placeholder="you@school.edu"]    visible
    Fill Text    input[placeholder="you@school.edu"]    test@email.com
    Fill Text    input[type="password"]    123456
    Click          css=button[type="submit"]:has-text("Sign In")
    Click    button.btn[type="submit"]

    Wait For Load State    networkidle