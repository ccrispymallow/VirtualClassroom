*** Settings ***
Resource    common.resource


*** Keywords ***
Register User
    [Arguments]    ${username}    ${email}    ${password}
    Go To          ${BASE_URL}/register
    Fill Text      css=input[placeholder="Enter your username"]    ${username}
    Fill Text      css=input[type="email"]                         ${email}
    Fill Text      css=input[type="password"]                      ${password}
    Click          css=button[type="submit"]:has-text("Register")

Login User
    [Arguments]    ${email}    ${password}
    Go To          ${BASE_URL}
    Fill Text      css=input[type="email"]      ${email}
    Fill Text      css=input[type="password"]   ${password}
    Click          css=button[type="submit"]:has-text("Login")
