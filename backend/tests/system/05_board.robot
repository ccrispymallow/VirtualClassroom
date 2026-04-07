*** Settings ***
Resource          resources/board_keywords.resource
Suite Setup       Setup Board Suite
Suite Teardown    Close Application


*** Keywords ***
Setup Board Suite
    Open Application
    Login As Test User


*** Variables ***
${TEST_ROOM_CODE}    MATHSESSION


*** Test Cases ***


TC-05-01: Create A Note On The Board
    [Documentation]    Verify user can create a sticky note.
    [Tags]    board    note    smoke    priority-critical
    Create Note On Board    ${TEST_ROOM_CODE}    Remember to submit homework!    yellow
    Wait For Elements State    css=.postit:has-text("Remember to submit homework!")    visible    timeout=5s


TC-05-02: Create Note Without Text Shows Error
    [Documentation]    Verify note creation fails with empty text.
    [Tags]    board    note    validation    priority-high
    Navigate To Board    ${TEST_ROOM_CODE}
    # Clear and leave textarea empty, then try to add
    Click    css=button:has-text("Add")
    Wait For Elements State    css=.field-error    visible    timeout=3s
    Get Text    css=.field-error    contains    required


TC-05-03: Delete A Note
    [Documentation]    Verify user can delete their own note.
    [Tags]    board    note    delete    priority-high
    Create Note On Board    ${TEST_ROOM_CODE}    Note to be deleted
    Delete Note    Note to be deleted
    Wait For Elements State    css=.postit:has-text("Note to be deleted")    hidden    timeout=5s


TC-05-04: Create An Announcement
    [Documentation]    Verify instructor can post an announcement.
    [Tags]    board    announcement    smoke    priority-critical
    Create Announcement    ${TEST_ROOM_CODE}    Welcome to the class!
    Wait For Elements State    css=.announcement-item:has-text("Welcome to the class!")    visible    timeout=5s


TC-05-05: Delete An Announcement
    [Documentation]    Verify instructor can delete an announcement.
    [Tags]    board    announcement    delete    priority-high
    Create Announcement    ${TEST_ROOM_CODE}    To be deleted
    Delete Announcement    To be deleted
    Wait For Elements State    css=.announcement-item:has-text("To be deleted")    hidden    timeout=5s


TC-05-06: Upload A File To The Board
    [Documentation]    Verify user can upload a file.
    [Tags]    board    file    priority-high
    Upload File To Board    ${TEST_ROOM_CODE}    ${CURDIR}/fixtures/test_file.pdf
    Wait For Elements State    css=.file-item:has-text("test_file.pdf")    visible    timeout=10s


TC-05-07: Delete An Uploaded File
    [Documentation]    Verify user can delete an uploaded file.
    [Tags]    board    file    delete    priority-medium
    Navigate To Board    ${TEST_ROOM_CODE}
    Click    css=.file-item:last-child >> button.delete-btn
    Wait For Elements State    css=.modal    visible
    Click    css=button:has-text("Confirm")
    Wait For Elements State    css=.status.success    visible    timeout=5s
