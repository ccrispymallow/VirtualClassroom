*** Settings ***
Resource    common.resource

*** Keywords ***
Navigate To Board
    [Arguments]    ${room_code}
    Go To          ${BASE_URL}/classroom/${room_code}
    Wait For Elements State    css=textarea[placeholder="Write a note..."]    attached    timeout=10s

Force Click Element
    [Arguments]    ${selector}
    # Uses JavaScript to click the element, bypassing the 3D canvas overlay blocking it
    Evaluate JavaScript    ${selector}    (elem) => elem.click()

Force Fill Text
    [Arguments]    ${selector}    ${text}
    # Uses JavaScript to securely inject text and trigger React's state update without needing Playwright visibility
    Evaluate JavaScript    ${selector}    (elem, arg) => { let proto = Object.getPrototypeOf(elem); let setter = Object.getOwnPropertyDescriptor(proto, "value").set; setter.call(elem, arg); elem.dispatchEvent(new Event('input', { bubbles: true })); }    arg=${text}

Create Note On Board
    [Arguments]    ${room_code}    ${note_text}    ${color}=yellow
    Navigate To Board    ${room_code}
    Force Fill Text        css=textarea[placeholder="Write a note..."]    ${note_text}
    Force Click Element    css=button[style*="rgb(253, 224, 71)"]
    Force Click Element    button:has-text("Add")
    Wait For Elements State    text="${note_text}"    attached    timeout=5s

Create Announcement
    [Arguments]    ${room_code}    ${announcement_text}
    Navigate To Board    ${room_code}
    Force Fill Text        css=textarea[placeholder="Post an announcement..."]    ${announcement_text}
    Force Click Element    css=button:text-is("Post")
    Wait For Elements State    text="${announcement_text}"    attached    timeout=5s

Delete Note
    [Arguments]    ${note_text}
    Force Click Element    xpath=//p[text()='${note_text}']/../button
    Wait For Elements State    text=Delete this note?    attached
    Force Click Element    xpath=//button[text()='Delete']

Delete Announcement
    [Arguments]    ${announcement_text}
    Force Click Element    xpath=//p[text()='${announcement_text}']/../button
    Wait For Elements State    text=Delete this announcement?    attached
    Force Click Element    xpath=//button[text()='Delete']

Upload File To Board
    [Arguments]    ${room_code}    ${file_path}
    Navigate To Board    ${room_code}
    Upload File By Selector    css=input[type="file"]    ${file_path}