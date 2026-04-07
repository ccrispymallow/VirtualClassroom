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
    Fill Text      css=input[type="email"]         ${VALID_EMAIL}
    Fill Text      css=input[type="password"]      ${VALID_PASSWORD}
    Click          css=button[type="submit"]:has-text("Login")
    Wait For Elements State    css=.home-layout    visible    timeout=5s
