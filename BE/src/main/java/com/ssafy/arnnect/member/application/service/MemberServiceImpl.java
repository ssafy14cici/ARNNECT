package com.ssafy.arnnect.member.application.service;

import com.ssafy.arnnect.common.exception.BusinessException;
import com.ssafy.arnnect.common.exception.ErrorCode;
import com.ssafy.arnnect.common.file.FileStorageService;
import com.ssafy.arnnect.common.file.FileType;
import com.ssafy.arnnect.common.util.FileNameGenerator;
import com.ssafy.arnnect.member.application.dto.request.CreateArtistRequest;
import com.ssafy.arnnect.member.application.dto.request.CreateMemberRequest;
import com.ssafy.arnnect.member.application.dto.request.UpdateArtistRequest;
import com.ssafy.arnnect.member.application.dto.request.UpdateMemberRequest;
import com.ssafy.arnnect.member.application.dto.response.MemberInfoResponse;
import com.ssafy.arnnect.member.application.dto.response.MyInfoResponse;
import com.ssafy.arnnect.member.domain.entity.Artist;
import com.ssafy.arnnect.member.domain.entity.Member;
import com.ssafy.arnnect.member.domain.entity.UserRole;
import com.ssafy.arnnect.member.repository.ArtistRepository;
import com.ssafy.arnnect.member.repository.MemberRepository;
import com.ssafy.arnnect.security.SecurityUtil;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class MemberServiceImpl implements MemberService{

    private final MemberRepository memberRepo;
    private final ArtistRepository artistRepo;
    private final PasswordEncoder passwordEncoder;
    private final FileStorageService fileStorageService;

    @Override
    @Transactional
    public void createMember(CreateMemberRequest request) throws IOException {
        Map<String, String> profileImageName = null;
        try {
            if(request.getImage() != null && !request.getImage().isEmpty()){
                profileImageName = fileStorageService.saveFile(request.getImage(), FileType.PROFILE);
            }
            Member member = request.toMemberEntity(profileImageName);
            member.encodePassword(passwordEncoder.encode(member.getPassword()));
            memberRepo.save(member);
            log.info("사용자 회원가입 : member => {}",member.toString());
        } catch (Exception e) {
            if(request.getImage() != null && !request.getImage().isEmpty()) {
                fileStorageService.deleteFile(profileImageName.get("saved"), FileType.PROFILE);
            }
        }
    }

    @Override
    @Transactional
    public void createArtist(CreateArtistRequest request) throws IOException {
        Map<String, String> profileImageName = null;
        String documentFileName = fileStorageService.saveFile(request.getDocument(), FileType.DOCUMENT).get("saved");
        try {
            if(request.getImage() != null && !request.getImage().isEmpty()){
                profileImageName = fileStorageService.saveFile(request.getImage(), FileType.PROFILE);
            }
            Member member = request.toMemberEntity(profileImageName);
            member.encodePassword(passwordEncoder.encode(member.getPassword()));
            Artist artist = request.toArtistEntity(member, documentFileName);
            artistRepo.save(artist);
            log.info("예술가 회원가입 : artist => {}",artist.toString());
        } catch (Exception e) {
            if(profileImageName != null && !request.getImage().isEmpty()) {
                fileStorageService.deleteFile(profileImageName.get("saved"), FileType.PROFILE);
            }
            fileStorageService.deleteFile(documentFileName, FileType.DOCUMENT);
        }
    }

    @Override
    @Transactional
    public void updateMember(UpdateMemberRequest request, String memberUuid) throws IOException{
       Member member = memberRepo.findByMemberUuid(memberUuid)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        String oldSavedProfileImageName = member.getSavedProfileImageName();
        Map<String, String> profileImageName = null;

        try{
            if(request.getImage() != null && !request.getImage().isEmpty()){
                profileImageName = fileStorageService.saveFile(request.getImage(), FileType.PROFILE);
            }
            if(request.getPassword() != null && !request.getPassword().isEmpty()){
                member.encodePassword(passwordEncoder.encode(member.getPassword()));
            }
            member.updateNickname(request.getNickname());
            if(profileImageName != null){
                member.updateProfileImage(profileImageName);
            }
            memberRepo.save(member);
            if(profileImageName != null && oldSavedProfileImageName != null){
                fileStorageService.deleteFile(oldSavedProfileImageName, FileType.PROFILE);
            }
        } catch (Exception e) {
            if(profileImageName != null){
                fileStorageService.deleteFile(profileImageName.get("saved"), FileType.PROFILE);
            }
            throw e;
        }
    }

    @Override
    @Transactional
    public void updateArtist(UpdateArtistRequest request, String memberUuid) throws IOException{
        Artist artist = artistRepo.findByMember_MemberUuid(memberUuid)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        Member member = artist.getMember();
        String oldSavedProfileImageName = member.getSavedProfileImageName();
        Map<String, String> profileImageName = null;

        try{
            if(request.getImage() != null && !request.getImage().isEmpty()){
                profileImageName = fileStorageService.saveFile(request.getImage(), FileType.PROFILE);
            }
            if(request.getPassword() != null && !request.getPassword().trim().isEmpty()){
                String encoded = passwordEncoder.encode(request.getPassword());
                member.encodePassword(encoded);
            }
            if(request.getNickname() != null && !request.getNickname().trim().isEmpty()){
                member.updateNickname(request.getNickname());
            }
            artist.updateArtist(request);
            if(profileImageName != null){
                member.updateProfileImage(profileImageName);
            }
            memberRepo.save(member);
            artistRepo.save(artist);
            if(profileImageName != null && oldSavedProfileImageName != null){
                fileStorageService.deleteFile(oldSavedProfileImageName, FileType.PROFILE);
            }

        } catch (Exception e) {
            if(profileImageName != null){
                fileStorageService.deleteFile(profileImageName.get("saved"), FileType.PROFILE);
            }
            throw e;
        }
    }

    @Override
    @Transactional
    public void deleteMember(String memberUuid) throws IOException {
        Member member = memberRepo.findByMemberUuid(memberUuid)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        member.deleteMember();
    }

    @Override
    public MyInfoResponse getMyInfo(String memberUuid, UserRole role) {
        if(UserRole.GENERAL.equals(role)){
            return MyInfoResponse.fromMember(memberRepo.findByMemberUuid(memberUuid).orElseThrow(
                    ()-> new BusinessException(ErrorCode.USER_NOT_FOUND)
            ));
        }else{
            return MyInfoResponse.fromArtist(artistRepo.findByMember_MemberUuid(memberUuid).orElseThrow(
                    ()->new BusinessException(ErrorCode.USER_NOT_FOUND)
            ));
        }
    }

    @Override
    public MemberInfoResponse getMemberInfo(String myUuid,String memberUuid) {
        return memberRepo.findMemberInfo(memberUuid,memberRepo.findByMemberUuid(memberUuid).orElseThrow(
                ()-> new BusinessException(ErrorCode.USER_NOT_FOUND)).getMemberId());
    }

    public Long getMemberId(String memberUuid){
        return memberRepo.findByMemberUuid(memberUuid).orElseThrow(
                ()-> new BusinessException(ErrorCode.USER_NOT_FOUND)).getMemberId();
    }
}
