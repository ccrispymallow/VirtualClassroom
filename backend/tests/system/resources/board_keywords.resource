*** Settings ***
Resource    common.resource


*** Keywords ***
Navigate To Board
    [Arguments]    ${room_code}
    Go To          ${BASE_URL}/classroom/${room_code}
    Wait For Elements State    css=textarea[placeholder="Write a note..."]    visible    timeout=10s

Create Note On Board
    [Arguments]    ${room_code}    ${note_text}    ${color}=yellow
    Navigate To Board    ${room_code}
    Fill Text      css=textarea[placeholder="Write a note..."]    ${note_text}
    # Select color by clicking the matching color dot button
    Click          css=button.color-dot.${color}
    Click          css=button:has-text("Add")
    Wait For Elements State    css=.postit:has-text("${note_text}")    visible    timeout=5s

Create Announcement
    [Arguments]    ${room_code}    ${announcement_text}
    Navigate To Board    ${room_code}
    Fill Text      css=input[placeholder="Write an announcement..."]    ${announcement_text}
    Click          css=button:has-text("Post")
    Wait For Elements State    css=.announcement-item:has-text("${announcement_text}")    visible    timeout=5s

Delete Note
    [Arguments]    ${note_text}
    Click          css=.postit:has-text("${note_text}") >> button.delete-btn
    Wait For Elements State    css=.modal    visible
    Click          css=button:has-text("Confirm")

Delete Announcement
    [Arguments]    ${announcement_text}
    Click          css=.announcement-item:has-text("${announcement_text}") >> button.delete-btn
    Wait For Elements State    css=.modal    visible
    Click          css=button:has-text("Confirm")

Upload File To Board
    [Arguments]    ${room_code}    ${file_path}
    Navigate To Board    ${room_code}
    # Trigger hidden file input via the upload button
    Click          css=button:has-text("Upload")
    Upload File By Selector    css=input[type="file"]    ${file_path}
